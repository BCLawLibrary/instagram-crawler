/* Exchanges long-lived Instagram Basic Display API token
   for a new token, stores token and current date in spreadsheet.
   Schedule to run every <60 days (token expires after 60). */

// Avi Bauer, script created 10/7/2020
// Last updated: 11/7/2020 : adapted to update tokens for multiple accounts
// (each account stored on a seperate sheet in the workbook)


/**
 * Sends current API key to Instagram Basic Display API
 * to retrieve a refreshed token for each account/sheet.
 */
function appendNewKey() {
  
  var spreadsheets = SpreadsheetApp.getActiveSpreadsheet().getSheets(); //get array of sheets
  
  for (let i = 0; i < spreadsheets.length; i++) {
  
    var sheet = SpreadsheetApp.setActiveSheet(spreadsheets[i])// select sheet
    var data = sheet.getDataRange().getValues(); // get current data
    var oldToken = data[data.length-1][0];  // get latest token
    
    if (data.length > 1) { //check that the sheet has content before trying to call the API  
      var newToken = refreshToken_(oldToken); // call API to get new token
    }
      
    var date = new Date(); // get current date
    date = date.toString();
    
    //Logger.log(newToken);
    sheet.appendRow([newToken,date]); //append new token and date to table
    
  }
}


/**
 * Helper function to send URL Request to 
 * Instagram Basic Display API
 * to refresh a long-lived token.
 *
 * @param {string} oldToken The current API token
 * @return {string} The refreshed API token
 */
function refreshToken_(oldToken) {
  
  // make call to API to refresh token
  var url = "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=" + oldToken;
  var response = UrlFetchApp.fetch(url);
  
  // process response
  var json = response.getContentText();
  var tokenData = JSON.parse(json);
  
  // Logger.log(response);
  return tokenData["access_token"];
  
}