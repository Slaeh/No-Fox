const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const queryString = require('querystring');
const crypto = require("crypto");
require('dotenv').config();
const client_id = process.env.client_id;
const client_secret = process.env.client_secret;
const port = 3000;
const server = http.createServer();
let fox_Image = '';

server.on("request", handle_connection);
server.on("listening", listening_handler);
server.listen(port);

function listening_handler(){
	console.log(`Now Listening on Port ${port}`);
}

function handle_connection(req, res){
    console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
    if(req.url === '/'){
		  const main = fs.createReadStream('html/main.html');
		  res.writeHead(200, {'Content-Type': 'text/html'});
      main.pipe(res);
    }
    else if(req.url === '/favicon.ico'){
		  res.writeHead(200, {'Content-Type': 'image/x-icon'});
		  const favi = fs.createReadStream('images/favicon.ico');
      favi.pipe(res);
    }
    else if(req.url === '/images/runningFoxGif.gif'){
		  res.writeHead(200, {'Content-Type': 'image/gif'});
		  const aGif = fs.createReadStream('images/runningFoxGif.gif');
      aGif.pipe(res);
    }
    else if(req.url === '/images/back.jpg'){
        res.writeHead(200, {'Content-Type': 'image/jpg'});
        const pic = fs.createReadStream('images/back.jpg');
        pic.pipe(res);
    }
    else if(req.url.startsWith("/submit")){
      https.get("https://randomfox.ca/floof/" , (resp) =>{
        let siteData = '';
        resp.on('data', (chunk)=>{
        siteData += chunk;
        
      });
      
      resp.on('end', () => {
        fox_Image = JSON.parse(siteData).image;
        console.log(fox_Image);
    
        let newFileName = JSON.parse(siteData).link;
        let parsedURL = url.parse(newFileName, true).query;
        
        if(fs.existsSync(`/foxLinks/${parsedURL.i}`)){
          console.log("We already used this image");
          res.writeHead(302, {Location: "/"})
          .end();
        }
        else{
          fs.writeFile(`./foxLinks/${parsedURL.i}.txt`, "Got a new fox", ()=> console.log("We made a new file"));
        }
        const state = crypto.randomBytes(20).toString("hex");
        redirect_To_Imgur(state, res, fox_Image);
      });
      
      resp.on("error", (err) => {
        console.log("There was an error: " + err.message);
      });
    });
   
  }
  
  else if(req.url.startsWith("/redirection1")) {
    console.log("First redirection");
    //const {access_token, refresh_token, state} = url.parse(req.url, true).query;
    const main2 = fs.createReadStream('html/main2.html');
    res.writeHead(200, {'Content-Type': 'text/html'});
    main2.pipe(res);
    //console.log(access_token);
  }
  else if(req.url.startsWith("/redirection_part2")){
    const {access_token, refresh_token, expires_in} = url.parse(req.url, true).query;
    console.log("Token:" + access_token);
    const tokens_request_time = new Date();
    request_To_Upload(access_token, fox_Image, res);
  }
  else{
		res.writeHead(404, {"Content-Type" : "text/plain"});
		res.write("404 Not Found", () => res.end());
  }
}   
    function redirect_To_Imgur(state, res, fox_Image){
      const authorization_endpoint = "https://api.imgur.com/oauth2/authorize";
      let uri = queryString.stringify({response_type: "token", client_id, state});
      console.log(uri);
      res.writeHead(302, {Location: `${authorization_endpoint}?${uri}`})
	   .end();

    }

    function request_To_Upload(access_token, fox_Image, res){
      const img_endpoint = "https://api.imgur.com/3/upload";
      console.log(fox_Image);
      const url_type = "url";
      const img_Title = "A random fox";
      const img_Description = "This picture is from RandomFox API";
      const post_data = queryString.stringify({image: fox_Image, type:url_type, title: img_Title, desciption: img_Description } );
      const options = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": 'application/x-www-form-urlencoded'
        }
    }
    https.request(
      img_endpoint,
      options,
      (img_stream) =>  process_stream(img_stream, receive_img_response, res)
      ).end(post_data);
      
  }

  function receive_img_response(body, res){
    const results = JSON.parse(body);
    console.log(results);
    let username = results.data.account_url;
    res.writeHead(302, {Location: `https://${username}.imgur.com/all`})
       .end();
  }

  function process_stream (stream, callback , ...args){
    let body = "";
    stream.on("data", chunk => body += chunk);
    stream.on("end", () => callback(body, ...args));
  }
