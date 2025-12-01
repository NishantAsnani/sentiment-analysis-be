const {google} = require('googleapis');

const youtube = google.youtube('v3');
const CONSTANTS=require('./constants');

async function getYouTubeComments(videoId,commentLimit=1000) {

    let nextToken=null;
    let comments=[];

do{
    const response = await youtube.commentThreads.list({
    part: 'snippet',
    videoId,
    order:'time',
    key:process.env.GOOGLE_AUTH_KEY,
    pageToken:nextToken
  });
    comments=comments.concat(response.data.items.map(item => item.snippet.topLevelComment.snippet.textDisplay));
    nextToken=response.data.nextPageToken;
}while(nextToken && comments.length<commentLimit);
  
  return comments.slice(0,commentLimit);
}


function calculateNetScore(sentimentCounts, totalComments) {
    const positive = sentimentCounts[CONSTANTS.POSITIVE].value || 0;
    const negative = sentimentCounts[CONSTANTS.NEGATIVE].value || 0;
    const neutral = sentimentCounts[CONSTANTS.NEUTRAL].value || 0;
    const mixed = sentimentCounts[CONSTANTS.MIXED].value || 0;
    
    
    const netPositive = positive - negative;
    const neutralContribution = neutral * 0.5;
    const mixedContribution = mixed * 0.4;
    
  
    const totalPositive = netPositive + neutralContribution + mixedContribution;
    

    const score = ((totalPositive + totalComments) / (2 * totalComments)) * 10;
    
    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

function extractKeywords(keyPhrasesResults, minScore = 0.8, topN = 20) {
    const keywordFrequency = {};
    
    keyPhrasesResults.forEach(result => {
        result.KeyPhrases.forEach(phrase => {
            
            if (phrase.Score >= minScore) {
                const text = phrase.Text.toLowerCase().trim();
                
                
                const wordCount = text.split(' ').length;
                if (wordCount >= 1 && wordCount <= 3) {
                    keywordFrequency[text] = (keywordFrequency[text] || 0) + 1;
                }
            }
        });
    });
    
    // Convert to array and sort by frequency
    const keywords = Object.entries(keywordFrequency)
        .map(([text, value]) => ({ text, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, topN); // Get top N keywords
    
    return keywords;
}



module.exports={
    getYouTubeComments,
    calculateNetScore,
    extractKeywords
}