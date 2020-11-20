# instagram-crawler
A one-page app that downloads and displays Instagram posts in a format that can be read by a web crawler.

Uses the Instagram Basic Display API to retrieve media and captions for all posts from the Library Instagram account, and builds a simple HTML page to display the posts in a format that can be read and stored by the Archive-It web crawler.

The Instagram API token is stored in a Google Sheet (which uses the provided Google App Script to refresh the long-lived token monthly), and is retreived using the Google Sheets API.

Relies on JQuery and Splide (splide.min.js and splide.min.css, from https://splidejs.com/), utilizes Google Sheets API V4 (https://developers.google.com/sheets/api) and Instagram Basic Display API (https://developers.facebook.com/docs/instagram-basic-display-api/).
