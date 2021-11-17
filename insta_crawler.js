/* 
 * INSTA_CRAWLER.JS
 * Purpose: to provide alternate crawling source for Archive-It.
 *
 * 1. Fetch Instagram Basic Display API access key from Google sheet (via Google Sheets API);
 * 2. Fetch post metadata from Instagram API;
 * 3. Format and display posts on single page.
 * 
 * Avi Bauer - bauerac@bc.edu
 * created 9/15/20
 * last updated 11/2/21
 * 
 * Google Sheets API Documentation: https://developers.google.com/sheets/api
 * Instagram Basic Display API Documentation: https://developers.facebook.com/docs/instagram-basic-display-api/
 *
 * REQUIRES: jQuery, splide (https://splidejs.com/)
*/


// --- 0. PARAMETERS ------------

var googleKey = "INSERT_GOOGLE_SHEETS_API_KEY_HERE"; // key for Google API
var googleSheetID = "INSTERT_GOOGLE_SHEET_ID_HERE"; // sheet ID for Google sheet containing Instagram API key
var googleURL = "https://sheets.googleapis.com/v4/spreadsheets/" + googleSheetID + "/values/'BCLL'!A:B?key=" + googleKey; // in getToken() - request URL to Google API

var fields = 'id,caption,media_type,media_url,timestamp,permalink'; // query fields
var token = ""; // in getToken() - Instagram Basic Display API access token (to be set)
var request_url = "https://graph.instagram.com/me/media?fields=" + fields + "&access_token="; // in getToken(), passed to callAPI() - request url to Instagram API, needs access token

var req_limit = 200; // in callbackAPI() - limit on requests sent to Instagram API (for testing)
var tally = 0; // in callAPI() - track number of requests sent to Instagram API
var post_list = []; // in callbackAPI() - array of post objects (starts empty)
var childPromises = []; // in callbackAPI(), callbackChild() - carousel promises array (starts empty)
var child_fields = 'id,media_type,media_url,permalink' // in callbackChild() - query fields for fetching child data of carousel posts

var name_reg = /(?<!\w)@\w+(\.\w+)*/g; // in processCaption() - regex to recognize usernames
var tag_reg = /#\w+/g;  // in processCaption() - regex to recognize tags

var time; // in processDate() - initialize Date object
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; // in processDate() - list of months

var slides = ''; // in buildCarousel() - initialize splide carousel string
var slide = ''; // in buildCarousel() - initialize individual slide string


// --- 1. FETCH INSTAGRAM API TOKEN ------------

// FUNCTION: send GET request to Google API to fetch current token from google sheet
function getToken() {
    $.ajax({
        method:'GET',
        url:googleURL,
        dataType:'JSON',
        success: function(response) {

            console.log('API Key fetched');

            // store Instagram API token and append to request_url
            token = response.values[response.values.length-1][0]; 
            request_url += token;

            //send request_url to callAPI()
            callAPI(request_url, callbackAPI);
        },
        error: function(e) {
            console.log('request for access token failed');
            console.log(e);
        }
    })
}


// --- 2. FETCH INSTAGRAM DATA ------------

// FUNCTION: AJAX request to Instagram API
function callAPI(url, callback) {
    $.ajax({
        method:'GET',
        url:url,
        dataType: "JSON",
        success: function() {
            tally++;
            console.log('response received: ' + tally);
        },
        error: function(e) {
            console.log("request failed");
            console.log(e);
            callback({});
        }

    }).done(function(response) {
        callback(response); // send to callback function (callbackAPI or callbackChild)
    });
}

// CALLBACK FUNCTION: callback to recursively request all post data from Instagram
function callbackAPI(results) {

    // append results array to existing posts array
    if (results.data) {
        post_list = [ ...post_list, ...results.data ];

        // if "next" url exists, set that as request_url and send another ajax request (and end function)
        if (results.paging.next && tally < req_limit) {
            request_url = results.paging.next;
            callAPI(request_url, callbackAPI);
            return
        }
    }

    // continue if (1) there is no next page or (2) there was an error that failed to return anything
    
    // post_list now contains an array of all post objects
    console.log('post requests finished - ' + tally + ' initial requests');
    
    // iterate through post list
    for (i=0; i < post_list.length; i++) {

        // if post is tagged as a carousel
        if (post_list[i].media_type === 'CAROUSEL_ALBUM') {
            // make post-specific request url
            request_url = 'https://graph.instagram.com/' + post_list[i].id + '/children?fields=' + child_fields + '&access_token=' + token;
            // then run ajax request to add child data to parent object
            callbackChild(i); 
        }
    } 

    // wait for all Promises to resolve before sending to page builder
    Promise.allSettled(childPromises).then((success) => {
        pageBuild(post_list);
    });
}

// CALLBACK FUNCTION: callback to store child image data within the parent post object
function callbackChild(i) {
    
    // create new Promise
    childPromises.push(new Promise((resolve, reject) => {
        callAPI('https://graph.instagram.com/' + post_list[i].id + '/children?fields=' + child_fields + '&access_token=' + token, (response) => {
            
            // append child data to parent
            post_list[i].children = response.data;
            resolve('children found.');

        });
    }));
}


// --- 3. BUILD AND FORMAT PAGE ------------

//FUNCTION: organize post data in an HTML structure
function pageBuild(posts) {

    // initialize post components, set header
    var post_div = ''; 
    var timestamp = ''; 
    var caption = ''; 
    var media = ''; 
    var header = '<div class="post_header"><a class="permalink" href="https://www.instagram.com/bclawlibrary/"><img src="bcls_icon.png" alt="Boston College Law School logo" class="user_icon"><span class="username">bclawlibrary</span><br><span class="subname">Boston College Law Library</span></a></div>'; 

    // iterate by post: construct post div with appropriate content
    for (let i=0; i<posts.length; i++) {
        
        timestamp = processDate(posts[i].timestamp, posts[i].permalink); // process timestamp

        // process caption
        if (posts[i].caption) {
            caption = processCaption(posts[i].caption);
        } else {
            caption = processCaption('');
        }

        // determine if carousel: if so, construct carousel structure
        if (posts[i].media_type === "CAROUSEL_ALBUM") {
            media = buildCarousel(posts[i].children);

        // else if video, create iframe
        } else if (posts[i].media_type === "VIDEO") { 
            media = `<div class="post_media"><iframe src="${posts[i].media_url}" alt="Instagram post" width="614px" height="614px"></iframe></div>`
        
        // else (if image), create image element
        } else {
            media = `<div class="post_media"><a href="${posts[i].permalink}"><img src="${posts[i].media_url}" alt="Instagram post"></a></div>`
        } 

        // assemble complete post element
        post_div = `<div class="post" id=${posts[i].id}>${header}${media}<div class="post_caption">${caption}${timestamp}</div></div>`

        // append post element to main page section
        $('.post_container').append(post_div);
    }

    // add post count to account info at top of page
    $('.post_count').text(`${posts.length} posts`);

    // add data retreival date to page footer
    //var date = new Date();
    //date = date.toString();
    //$('.footer_content').append(`Data retreived: ${date}.`);

    // initialize Splide for all carousel posts
    var elms = document.getElementsByClassName('splide');
    for (let i=0; i<elms.length; i++) {
        new Splide(elms[i]).mount();
    }
};

// HELPER FUNCTION: format caption (add account name, links, line breaks)
function processCaption(caption) {
    
    // convert @'s and #'s to links, replace line breaks with '<br>'
    caption = caption.replace(name_reg, function(match) {
        return `<a href="https://www.instagram.com/${match.substring(1)}/">${match}</a>`;
    }).replace(tag_reg, function(match) {
        return `<a href="https://www.instagram.com/explore/tags/${match.substring(1)}/">${match}</a>`;
    }).replace(/(?:\r\n|\r|\n)/g, '<br>');

    // add account username, wrap in p element
    caption = '<p class="caption"><a class="username" href="https://www.instagram.com/bclawlibrary/">bclawlibrary</a> ' + caption + '</p>';
    
    return caption;
};

// HELPER FUNCTION: format timestamp (change date format, add permalink)
function processDate(timestamp, permalink) {

    //convert timestamp string to "MMM DD YYYY"
    time = new Date(Date.parse(timestamp.substring(0,10)));
    timestamp = months[time.getMonth()] + ' ' + time.getDate() + ' ' + time.getFullYear();

    // wrap in p element
    timestamp = `<p class="timestamp"><a href="${permalink}">${timestamp}<a></p>`;

    return timestamp;
}

// HELPER FUNCTION: splide carousel constructor
function buildCarousel(children) {

    //start new Splide structure
    slides = '<div class="splide post_media"><div class="splide__track"><ul class="splide__list">';

    //generate slide per child image
    for (i=0; i<children.length; i++) {
        slide = `<li class="splide__slide"><img src="${children[i].media_url}" alt="Instagram post" id="${children[i].id}"></li>`
        slides = slides + slide;
    }

    //add closing tags
    slides = slides + '</ul></div></div>';

    return slides;
}


//--- 4. FUNCTION CALL ------------

//chain starts with getToken()
$(document).ready(getToken);
