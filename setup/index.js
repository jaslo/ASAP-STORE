var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var query = require('querystring');
var ejs = require('ejs')
var _ = require('underscore');
var crypto = require('crypto');
var redis = require("redis"), client = redis.createClient();

http.createServer(function(req, res){

var url_parts = url.parse(req.url);

var querystring = query.parse(url_parts.query);

    if (url_parts.pathname === '/') {
        if(!url_parts.query)
        {
            res.writeHead(200, {'Content-Type': 'text/html'});
            fs.readFile('views/index.html', 'utf-8', function(err, content) {
            if (err) {
              res.end('error occurred');
              return;
            }
            var temp = 'some temp';  //here you assign temp variable with needed value
            client.hgetall('userlist', function (derr, users){
            if(!derr){
                totalUsers = _.size(users);
            }
            var renderedHtml = ejs.render(content, {users: users, totalUsers:totalUsers});  //get redered HTML code
            res.end(renderedHtml);
           });
         });
        }
        else
        {
            if(querystring.action=='edit')
            {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(querystring));
            }
            else if(querystring.action=='add')
            {
                var email = querystring.email;
                var password = querystring.password;
                var random = _.random(10000, 1000000000).toString(36);
                var uid = crypto.createHmac("sha256", random).digest('base64');
                //var email = process.argv[2];

                var passhash = crypto.pbkdf2Sync(password, random, 20, 32);
                var crdate = new Date();
                var username = email.substring(email.indexOf('@'),-1);
                client.hset('userlist', 'U-'+email, uid+":"+passhash+":"+random+":"+crdate.valueOf()+":"+username+":"+1);
                var hashpriv = crypto.createHmac("sha256", _.uniqueId('priavte')+_.random(1000, 10000000000)).digest('base64'); //secret
                var hashpub  =  crypto.createHmac("md5", _.uniqueId('priavte')+_.random(1000, 10000000000)).digest('base64'); //accesskey
                client.set('M-'+uid, hashpub);
                client.set('K-'+hashpub, uid+":"+hashpriv+":1:"+username);
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({}));
            }
            else if(querystring.action=='delete')
            {
                var email = querystring.email;
                client.hdel('userlist', 'U-'+email); 
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({}));
            }
            else if(querystring.action=='load')
            {
                var email = querystring.email;
                client.hexists('userlist', 'U-'+email, function (err, values){
            
                    if(parseInt(values) === 1)
                    { 
                       client.hget('userlist', 'U-'+email, function (derr, dreply){
                           if(!derr){
                                userdetails = dreply.split(":");

                                client.get("M-"+userdetails[0], function (err, reply){
                                if(!err){
                                        client.get("K-"+reply, function (perr, preply){
                                        if(!perr){
                                            var userdata =  preply.split(":");
                                            
                                            publickey = reply.split("==");
                                             res.writeHead(200, {'Content-Type': 'application/json'});
                                             res.end(JSON.stringify({"email":email,"appKey":publickey[0],"secretKey":userdata[1]}))
                                            }
                                        });
                                    }
                                });
                            }
                        });              
                   }
                });
            }
            else
            {
                res.writeHead(400, {'Content-Type': 'text/html'});
                res.end("<h1>404 Not Found</h1>");                
            }
        }
    }
    else if(url_parts.pathname === '/public/javascripts/jquery-1.9.0.min.js')
    {
        res.writeHead(200, {'Content-Type': 'text/javascript'});
        fs.createReadStream('public/javascripts/jquery-1.9.0.min.js').pipe(res);
    }
    else if(url_parts.pathname === '/public/javascripts/custom.js')
    {
        res.writeHead(200, {'Content-Type': 'text/javascript'});
        fs.createReadStream('public/javascripts/custom.js').pipe(res);
    }
    else if(url_parts.pathname === '/public/stylesheets/style.css')
    {
        res.writeHead(200, {'Content-Type': 'text/css'});
        fs.createReadStream('public/stylesheets/style.css').pipe(res);
    }
    else
    {
        res.writeHead(400, {'Content-Type': 'text/html'});
        res.end("<h1>404 Not Found</h1>");
    }
}).listen(8000);