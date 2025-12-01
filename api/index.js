const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const { getYouTubeComments, calculateNetScore, extractKeywords } = require('../utils/helper.js');
const data = require('../seeders/data');
const CONSTANTS = require('../utils/constants.js')
const sanitizeHtml = require("sanitize-html");

router.post('/analyze-sentiment', async (req, res) => {
    // const { text } = req.body;
    const { url } = req.body;
    const videoId = url.split('v=')[1];
    const comments = await getYouTubeComments(videoId);





    const comprehend = new AWS.Comprehend({ region: 'us-east-1' });
    const LanguageObject = await comprehend.detectDominantLanguage({ Text: data[0] }).promise();

    const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'hi', 'ja', 'ko', 'zh'];
    let dominantLanguage = LanguageObject.Languages[0].LanguageCode;

    if (!supportedLanguages.includes(dominantLanguage)) {
        dominantLanguage = 'en';
    }

    const params = {
        LanguageCode: dominantLanguage,
        Text: data[0]
    };

    try {
        const response = await comprehend.detectSentiment(params).promise();
        res.json({ sentiment: response.Sentiment, sentimentScore: response.SentimentScore });
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: error.message });
    }
});

router.post('/batch-analyze-sentiment', async (req, res) => {

    const { url } = req.body;
    const videoId = url.split('v=')[1];

    try {
        const comments = await getYouTubeComments(videoId);
        let finalResponse = {};
        const comprehend = new AWS.Comprehend({ region: process.env.AWS_REGION });

        let allResults = [];
        const batches = [];
        const BATCH_SIZE = 25;
        const cleanedComments = comments.map(c =>
            sanitizeHtml(c, { allowedTags: [], allowedAttributes: {} })
        ).map((c)=>c.trim()).filter((c)=>c.length>0).filter((c)=>Buffer.byteLength(c, 'utf8') <= 4500);
        for (let i = 0; i < cleanedComments.length; i += BATCH_SIZE) {
            batches.push(cleanedComments.slice(i, i + BATCH_SIZE))
        }

        const batchPromises = batches.map(batch => {
            const params = {
                LanguageCode: "en",
                TextList: batch,
            };
            return comprehend.batchDetectSentiment(params).promise();
        });

        const [sentimentResults, keyPhrasesResults] = await Promise.all([
            Promise.all(
                batches.map(batch =>
                    comprehend.batchDetectSentiment({
                        LanguageCode: "en",
                        TextList: batch,
                    }).promise()
                )
            ),
            Promise.all(
                batches.map(batch =>
                    comprehend.batchDetectKeyPhrases({
                        LanguageCode: "en",
                        TextList: batch,
                    }).promise()
                )
            )
        ]);

        const allKeyPhrasesResults = keyPhrasesResults.flatMap(result => result.ResultList);

        const results = await Promise.all(batchPromises);
        allResults = results.flatMap(result => result.ResultList);

        const sentimentCounts = {
            [CONSTANTS.NEGATIVE]: {
                value: 0,
                comments: []
            },
            [CONSTANTS.POSITIVE]: {
                value: 0,
                comments: []
            },
            [CONSTANTS.MIXED]: {
                value: 0,
                comments: []
            },
            [CONSTANTS.NEUTRAL]: {
                value: 0,
                comments: []
            }
        }

        allResults.forEach((comment, index) => {
            if (sentimentCounts.hasOwnProperty(comment.Sentiment)) {
                sentimentCounts[comment.Sentiment].value++;
                sentimentCounts[comment.Sentiment].comments.push(cleanedComments[index]);
            }
        })

        const sentimentDistribution = [
            {
                name: CONSTANTS.POSITIVE,
                value: sentimentCounts[CONSTANTS.POSITIVE].value
            },
            {
                name: CONSTANTS.NEGATIVE,
                value: sentimentCounts[CONSTANTS.NEGATIVE].value
            },
            {
                name: CONSTANTS.NEUTRAL,
                value: sentimentCounts[CONSTANTS.NEUTRAL].value
            },
            {
                name: CONSTANTS.MIXED,
                value: sentimentCounts[CONSTANTS.MIXED].value
            },
        ]
        const maxSentiment = Object.keys(sentimentCounts).reduce((max, key) =>
            sentimentCounts[key].value > sentimentCounts[max].value ? key : max);

        const totalCounts = allResults.length
        const overallScore = calculateNetScore(sentimentCounts, totalCounts)
        const pickedComments = {
            "positive": sentimentCounts[CONSTANTS.POSITIVE].comments.slice(0, (Math.min(5, sentimentCounts[CONSTANTS.POSITIVE].comments.length))),
            "negative": sentimentCounts[CONSTANTS.NEGATIVE].comments.slice(0, (Math.min(5, sentimentCounts[CONSTANTS.NEGATIVE].comments.length))),
            "neutral": sentimentCounts[CONSTANTS.NEUTRAL].comments.slice(0, (Math.min(5, sentimentCounts[CONSTANTS.NEUTRAL].comments.length))),
            "mixed": sentimentCounts[CONSTANTS.MIXED].comments.slice(0, (Math.min(5, sentimentCounts[CONSTANTS.MIXED].comments.length)))
        }
        const pickedKeywords = extractKeywords(allKeyPhrasesResults);


        finalResponse.sentimentDistribution = sentimentDistribution
        finalResponse.overallSentiment = maxSentiment
        finalResponse.overallScore = overallScore
        finalResponse.comments = pickedComments
        finalResponse.keywords = pickedKeywords
        finalResponse.totalCount=allResults.length
        res.json({ results: finalResponse });
    } catch (error) {
        console.log(error)
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