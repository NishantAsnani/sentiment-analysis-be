const {google} = require('googleapis');

const youtube = google.youtube('v3');

async function getYouTubeComments(videoId,commentLimit=10) {

    let nextToken=null;
    let comments=[];

do{
    const response = await youtube.commentThreads.list({
    part: 'snippet',
    videoId,
    maxResults:commentLimit,
    order:'relevance',
    key:process.env.GOOGLE_AUTH_KEY,
    pageToken:nextToken
  });
    comments=comments.concat(response.data.items.map(item => item.snippet.topLevelComment.snippet.textDisplay));
    nextToken=response.data.nextPageToken;
}while(nextToken && comments.length<commentLimit);
  
  return comments.slice(0,commentLimit);
}

module.exports={
    getYouTubeComments
}