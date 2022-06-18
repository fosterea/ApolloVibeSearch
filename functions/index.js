const functions = require("firebase-functions");

// The Firebase Admin SDK to access Firestore.
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

initializeApp();

const db = getFirestore();
const wordsRef = db.collection('words');

exports.search = functions.https.onRequest(async (req, res) => {
    // Grab the input parameter.
    const input = req.query.input;
    // Tokenize
    const tokens = tokenize(input);

    // Pull words in tokenized input
    const snapshot = await wordsRef.where('word', 'in', tokens).get();
    // Returns error if snapshot is empty aka no words
    // in database match any in query
    if (snapshot.empty) {
        res.json({error: 'No words in database matching any word in query.'});
        return;
    }  

    // Add up cumulitive query similarity
    // for each vibe then average.
    ranks = build_ranks(snapshot)

    // Sort ranks
    ranks.sort( function( a , b) {
        a = a.sim;
        b = b.sim;
        if(a > b) return -1;
        if(a < b) return 1;
        return 0;
    });

    if (req.query.ui) {
        ui_show(res, ranks, req)
    } else {
        // Send back a message that we've successfully written the message
    res.json({result: ranks});
    }
});

// Tokenizer
function tokenize(input) {
    var cleaned = onlyLettersAndSpaces(input.toLowerCase());
    console.log(cleaned)
    var query_list = cleaned.split(' ');
    return query_list;
}
function onlyLettersAndSpaces(str) {
    // Doesn't remove numbers but this is good enough
    return str.replace(/[^\w\s]/gi, "");
}

// Compiles all similarity data into 
// ranks of the average word similarity
function build_ranks(snapshot) {
    // Init the cumulative ranks data struct
    ranks = []
    for (sim of snapshot.docs[0].data().sims) {
        ranks.push({
            sim: 0,
            vibe_name: sim.vibe_name
        })
    }
    // Add sims for each vibe
    // from the words together
    // to get cumulitive query
    // similarity
    for (doc of snapshot.docs) {
        var sims = doc.data().sims
        for (i in sims) {
            ranks[i].sim += sims[i].vibe_sim;
        }
    }

    // Average
    num_docs = snapshot.size
    for (rank of ranks) {
        rank.sim /= num_docs
    }

    return ranks
}


// return ui instead of json
function ui_show(res, ranks, req) {
    ranks_html = "";
    var old_input = req.query.input
    for (rank of ranks) {
        ranks_html += `<div class="rank">${rank.vibe_name} <x style="padding-right:10px;padding-left:10px;">-</x> ${rank.sim.toLocaleString(undefined,{style: 'percent', minimumFractionDigits:2})}</div>`
    }
    html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>
            .rank {
                width: 350px;
                background: rgb(0, 119, 255);
                color: white;
                margin: 5px;
                padding: 5px;
                border-radius: 5px;
                margin-right: auto;
                margin-left: auto;
            }
            body {
                text-align: center;
            }
            #input {
                width: 250px;
            }
            #ranks {
                padding-top: 10px;
            }
        </style>
    </head>
    <body>
        <h1>Test out ApolloVibeSearch cloud function!</h1>
        <form method="GET">
            <input id="input" name="input" type="text" value="${old_input}"/>
            <input id="ui" type="hidden" name="ui" value="true"> 
            <input type="submit"/>
        </form>
        <div id="ranks">
        ${ranks_html}
        </div>
    </body>
    </html>
    `
    res.send(html)
}
