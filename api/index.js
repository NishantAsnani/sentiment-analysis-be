const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const { getYouTubeComments } = require('../utils/helper.js');
const data = require('../seeders/data');
const _ = require('lodash');

router.post('/analyze-sentiment', async (req, res) => {
    // const { text } = req.body;
    const { url } = req.body;
    const videoId = url.split('v=')[1];
    const comments = await getYouTubeComments(videoId);





    const comprehend = new AWS.Comprehend({ region: 'us-east-1' });
    const LanguageObject = await comprehend.detectDominantLanguage({ Text: data }).promise();

    const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'hi', 'ja', 'ko', 'zh'];
    let dominantLanguage = LanguageObject.Languages[0].LanguageCode;

    if (!supportedLanguages.includes(dominantLanguage)) {
        dominantLanguage = 'en';
    }

    const params = {
        LanguageCode: dominantLanguage,
        Text: data
    };

    try {
        const response = await comprehend.detectSentiment(params).promise();
        res.json({ sentiment: response.Sentiment, sentimentScore: response.SentimentScore });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/batch-analyze-sentiment', async (req, res) => {
    // const { text } = req.body;

    const { url } = req.body;
    const videoId = url.split('v=')[1];




    try {
        const comments = await getYouTubeComments(videoId);
        const comprehend = new AWS.Comprehend({ region: process.env.AWS_REGION });

        let allResults = [];
        const BATCH_SIZE = 25;
        for (let i = 0; i < comments.length; i += BATCH_SIZE) {
            const batch = comments.slice(i, i + BATCH_SIZE);

            const params = {
                LanguageCode: "en",
                TextList: batch,
            };
            const result = await comprehend.batchDetectSentiment(params).promise();
            const keyPhrases=await comprehend.batchDetectKeyPhrases(params).promise();
            console.log(keyPhrases.ResultList[0],"KEYPHRASES");

            allResults = allResults.concat(result.ResultList);
        }
        res.json({ results: allResults });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.get('/youtube-comments', async (req, res) => {
    const { url } = req.query;
    const videoId = url.split('v=')[1];

    try {
        const comments = await getYouTubeComments(videoId);
        res.json({ comments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})




module.exports = router