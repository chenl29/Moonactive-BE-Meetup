const fs = require('fs');
const express = require('express')
const app = express()
const port = +process.argv[2] || 3000

const client = require('redis').createClient()
client.on('error', (err) => console.log('Redis Client Error', err));

client.on('ready', () => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Example app listening at http://0.0.0.0:${port}`)
    })
})

const cardsData = fs.readFileSync('./cards.json');
const cards = JSON.parse(cardsData);

async function getMissingCard(key) {
    let memoKey = 'memo' + key
    let filterredCards;
    const userCards = await client.zRange(key, 0, -1)
    let savedFilterredCards = await client.get(memoKey);
    
    if (savedFilterredCards == undefined) {
        let indexedUserCards = {}
        for (let i = 0; i < userCards.length; i++) {
            let userCard = JSON.parse(userCards[i])
            indexedUserCards[userCard.id] = userCard.name;
        }

        allCards = [...cards]
        filterredCards = allCards.filter((value) => {
            return !indexedUserCards[value]
        })

    } else {
        filterredCards = JSON.parse(savedFilterredCards)
    }

    let card = filterredCards.pop();
    await client.set(memoKey, JSON.stringify(filterredCards));
    return card;
}

app.get('/card_add', async (req, res) => {
    const key = 'user_id:' + req.query.id
    let missingCard = ''
    while (true) {
        missingCard = await getMissingCard(key);
        if (missingCard === undefined) {
            res.send({id: "ALL CARDS"})
            return
        }
        result = await client.ZADD(key, {score: 0, value: JSON.stringify(missingCard)}, 'NX')
        if (result === 0) {
            continue
        }
        break
    }
    res.send(missingCard)
})

app.get('/ready', async (req, res) => {
    res.send({ready: true})
})

client.connect();
