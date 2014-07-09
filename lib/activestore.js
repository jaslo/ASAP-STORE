var Hapi = require('hapi');
var xmljs = require('xml2js');
var xmldoc = require('xmldoc');
var defineClass = require("./defineClass.js").defineClass;
var crypto = require('crypto');
var cluster = require('cluster');
var _ = require('underscore');
var fs = require("fs");

var Asauth = require("./asauth.js");
var Bucket = require("./bucket.js");
var Object = require("./object.js");
var Errors = require("./errors.js");
var configinfo = require("./config.js");

var os = require('os');
var cpuinfo = os.cpus();
var netinfo = os.networkInterfaces();
var osinfo = os.type() + ' Version: ' + os.release();
var meminfo = "Total: "+ os.totalmem() +" Available: "+  os.freemem();
var numCPUs = os.cpus().length;
var starttime = new Date().getTime();
var clientAuth = new Asauth.ASAUTH_Class;

var optionpriv = {};
if(configinfo.isSecure)
{
    var fs = require('fs');
    optionpriv = {
          key:  fs.readFileSync(configinfo.SSLKey, 'utf8'),
          cert: fs.readFileSync(configinfo.SSLCert, 'utf8')
    };
}

var xamzacl = Array( 'private',
                     "public-read",
                     "public-read-write" ,
                     "authenticated-read",
                     "bucket-owner-read" ,
                     "bucket-owner-full-control");
var xamzaclkey = Array('x-amz-grant-read',
                       'x-amz-grant-write',
                       'x-amz-grant-read-acp',
                       'x-amz-grant-write-acp', 
                       'x-amz-grant-full-control');

var WhiteList = Array('?acl', '?cors', '?lifecycle', '?policy', '?logging', '?notification', '?tagging', '?requestpayment', '?versioning', '?website', '?delete', '?location', '?uploads','?versionId');

/*
 * 
 * @param {type} pubkey
 * @param {type} id
 * @param {type} pkey
 * @returns {String}
 */
var GetAuthorizeKey = function(pubkey, id, pkey){
    if(pubkey && id && pkey)
        return 'AWS '+pubkey+':'+crypto.createHmac("sha1",pkey).update('as'+id).digest("base64");
    else
        return false;
};

/*
 * 
 * @param {type} bname
 * @returns {Boolean}
 */
function CheckBucketName(bname){
    //var domain_array = nname.split('.');
    //var domain = domain_array[0];
    //This is reguler expresion for domain validation
    if(!bname)
        return false;
    var reg = /^([a-z0-9])+[A-Za-z0-9-]+([a-z0-9])$/;
    if(bname === '' || (bname.length <3) ||  (bname.length > 255)){
        console.log('Empty or Invalid Bucket Name');
        return false; 
    } 
    if(reg.test(bname) === false){
        console.log("Invalid character in domain. Only letters, numbers or hyphens are allowed.");
        return false;
    }
    return true;
}
/*
 * 
 * @param {type} hoststyle
 * @param {type} paramstyle
 * @param {type} paramid
 * @returns {Boolean}
 */

function Extract_Bucke_Object(confighost, hoststyle , paramstyle ){
    //console.log(confighost, hoststyle , paramstyle);
    var bres = null;
    var ores = null;
    if (hoststyle) {
        if(hoststyle === confighost)
        {
            if(paramstyle[1])
                bres = paramstyle[1];
            if(paramstyle[1])
                ores = paramstyle[1];
            return Array(bres, ores);
        }else{
            var currentdomain = '.'+ confighost;
            if(hoststyle){
                bres = hoststyle.replace(currentdomain, '');
                if(CheckBucketName(bres)){
                    if(paramstyle[1])   
                        ores = paramstyle[1];
                    return Array(bres, ores);
                }
            }
        }
    }
    else if(paramstyle) {
        if(paramstyle[1]){
            if(CheckBucketName(paramstyle[1]))
                bres = paramstyle[1];
        }
        if(paramstyle[2])
            ores = paramstyle[2];          
        return Array(bres, ores);
    }
    return false;
}

var ProcessGETHEAD = {
    handler: function(request, reply)
    {
        //console.log("GET Call", request.headers);
        var bid = _.random(10000,1000000000);
        var authval = request.headers.authorization.split(":");
        var keyname = '';

        var boinfo = Extract_Bucke_Object(configinfo.server.Host, request.url.hostname, request._pathSegments);
        var bucketname = boinfo[0];
        var objectname = boinfo[1];

       if(request.method.toUpperCase() === 'HEAD'){
            // Need to check headers : Range, If-Modified-Since, If-Unmodified-Since, If-Match, f-None-Match
            if(bucketname && objectname){

                if(_.size(request.query) >0){
                    if( request.query.versionId !== undefined) {
                        // Do some processing for version no. vx-amz-expiration, x-amz-version-id
                    }

                }else{
                    var obj = new Object.OBJECT_Class(bucketname, objectname);
                    obj.IsObjectExist(null, function(err, meta){
                        if(!err){
                            var metad = meta.split("#");
                            return reply().code(200)
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("ETag", metad[2])
                            .header("Content-Length", metad[1])
                            .header("Last-Modified", metad[3])
                            .header("Connection", 'Close');
//                          Need to add: Content-Type: text/plain
                        }else{
                            delete obj;
                            var error = Hapi.error.badRequest('NoSuchKey');
                            error.output.statusCode = 404;
                            error.reformat();
                            reply(error);
                        }
                    });          
                }

            }
            if(bucketname)
            {
                var bacllist = new Bucket.BUCKET_Property(bucketname);
                bacllist.IsBucketExist(function (isexist){
                    if(isexist){
                        return reply().code(200)
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');
                    }else{
                        return reply().code(404)
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid);
                    }
                });
            }else{
                return reply().code(400)
                    .header("Server", configinfo.server.Name)
                    .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                    .header("x-amz-request-id", bid)
                    .header("Connection", 'Close');                
            }
        }
        
        if(request.method.toUpperCase() === 'GET'){
            var is_search_query = false;
            if(bucketname && objectname && _.size(request.query)>0)
            {
                 if(typeof(request.query.acl)!=='undefined'){
                    var obj = new Object.OBJECT_Class(bucketname, objectname);
                    obj.getObjAcl(function(error, response){    
                        console.log("response is ", response);
                        if(error){
                            var error = Hapi.error.badRequest('InternalError');
                                error.output.statusCode = 500;
                                error.reformat();
                                reply(error);    
                        } else {
                            return reply(response).code(200)
                            .type('application/xml')
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');
                        }
                    });
                }
                if( request.query.uploadId !== undefined) {
                    var obj = new Object.OBJECT_Class(bucketname, objectname);
                    obj.ListPart(request.query.uploadId, function(error, response){
                        if(error) {
                            var error = Hapi.error.badRequest('InternalError');
                                error.output.statusCode = 500;
                                error.reformat();
                                reply(error);    
                        }else{
                            return reply(response).code(200)
                                .header("Server", configinfo.server.Name)
                                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                .header("x-amz-request-id", bid)
                                .header("Connection", 'Close');
                        }
                    });    
                }       
            }

            if(bucketname && objectname){
                //Need to handle response-content-type, response-content-language
                // response-expires, response-cache-control, response-content-disposition, response-content-encoding
                var objg = new Object.OBJECT_Class(bucketname, objectname);
                objg.GetObject(null, function(err, meta, objdata){
                    if(err){
                        delete objg;
                        var error = Hapi.error.badRequest('InvalidObjectState');
                        error.output.statusCode = 4033;
                        error.reformat();
                        reply(error);
                    }else{
                        var metad = meta.split("#");
                        return reply(objdata).code(200)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("x-amz-request-id", bid)
                        .header("ETag" ,metad[2])
                        .header("Server", configinfo.server.Name)
                        .header("Connection", 'Close');
                        //Need to add Last-Modified
                    }
                });
            }
            
            if(bucketname && _.size(request.query) >0){
                /* This is not standard command but gives a list of availble zone*/
                if(request.query.cors !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetCorsConfig(function(replytextc){
                        if(replytextc){
                            delete bacllist;
                            return reply(replytextc).code(200)
                            .type("application/xml")
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');
                        } else {
                            //Avinash: Need to discuss about error message
                            //console.log("Error in GetCorsConfig");
                            var error = Hapi.error.badRequest('InformationNotAvailable');
                            error.output.statusCode = 4096;
                            error.reformat();
                            reply(error);
                        }
                    });
                }
                if( request.query.acl !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetACLConfig(function(replytexta){
                        delete bacllist;
                        if(replytexta){
                            return reply(replytexta).code(200)
                                .type('application/xml')
                                .header("Server", configinfo.server.Name)
                                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                .header("x-amz-request-id", bid)
                                .header("Connection", 'Close');
                        }else{
                            var error = Hapi.error.badRequest('InvalidArgument');
                            error.output.statusCode = 4008;
                            error.reformat();
                            reply(error);
                        }
                    });
                }
                if( request.query.lifecycle !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetLifecycleConfig(function(lcconfig){
                        delete bacllist;
                        if(!lcconfig)
                        {
                            var error = Hapi.error.badRequest('NoSuchLifecycleConfiguration');
                                error.output.statusCode = 4042;
                                error.reformat();
                                reply(error);
                        }else{
                            return reply(lcconfig).code(200)
                                .type('application/xml')
                                .header("Server", configinfo.server.Name)
                                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                .header("x-amz-request-id", bid)
                                .header("Connection", 'Close');
                        }
                    });
                    
                }
                if( request.query.location !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetLocation(function(replytextloc){
                        if(replytextloc)
                        {
                            delete bacllist;
                            return reply(replytextloc).code(200)
                            .type('application/xml')
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');
                        } else {
                            var error = Hapi.error.badRequest('InvalidLocationConstraint');
                                error.output.statusCode = 40012;
                                error.reformat();
                                reply(error);
                        }
                    });
                }
                if( request.query.logging !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetLogConfig(function(replytextlog){
                        if(replytextlog) {
                            delete bacllist;
                            return reply(replytextlog).code(200)
                            .type('application/xml')
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');    
                        } else {
                            //console.log("Error in GetLogConfig");
                            var error = Hapi.error.badRequest('NoLoggingStatusForKey');
                                error.output.statusCode = 40028;
                                error.reformat();
                                reply(error);
                        }
                    });
                }
                if( request.query.notification !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetNotificationConfig(function(replytextn){
                        if(replytextn) {
                            delete bacllist;
                            return reply(replytextn).code(200)
                            .type('application/xml')
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');    
                        } else {
                            var error = Hapi.error.badRequest('InformationNotAvailable');
                            error.output.statusCode = 4096;
                            error.reformat();
                            reply(error);
                        }
                    });
                }
                    
                if( request.query.tagging !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetTag(function(replytextt){
                        if(replytextt){
                            delete bacllist;
                            return reply(replytextt).code(200)
                                .type('application/xml')
                                .header("Server", configinfo.server.Name)
                                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                .header("x-amz-request-id", bid)
                                .header("Connection", 'Close');
                        }else{
                            var error = Hapi.error.badRequest('InformationNotAvailable');
                            error.output.statusCode = 4096;
                            error.reformat();
                            reply(error);
                        }    
                    });
                }
                
                if( request.query.requestPayment !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetReqPayerConfig(function(replytextp){
                        if(replytextp){
                           delete bacllist;
                           return reply(replytextp).code(200)
                               .type('application/xml')
                               .header("Server", configinfo.server.Name)
                               .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                               .header("x-amz-request-id", bid)
                               .header("Connection", 'Close');
                        } else {
                           var error = Hapi.error.badRequest('InvalidPayer');
                           error.output.statusCode = 4043;
                           error.reformat();
                           reply(error);
                        }
                    });
                }
                if( request.query.versioning !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetVersioning(function(replytextv){
                        if(replytextv) {    
                            delete bacllist;
                            return reply(replytextv).code(200)
                            .type('application/xml')
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');
                        } else {
                            //console.log("Redis Error");
                            var error = Hapi.error.badRequest('NoSuchVersion');
                                error.output.statusCode = 4043;
                                error.reformat();
                                reply(error);
                        }
                    });
                }
                if( request.query.website !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetWebConfig(function(replytextw){
                        if(replytextw) {
                            delete bacllist;
                            return reply(replytextw).code(200)
                                .type('application/xml')
                                .header("Server", configinfo.server.Name)
                                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                .header("x-amz-request-id", bid)
                                .header("Connection", 'Close');
                        } else {
                            var error = Hapi.error.badRequest('InformationNotAvailable');
                            error.output.statusCode = 4096;
                            error.reformat();
                            reply(error);
                        }
                    });
                }
                if( request.query.policy !== undefined) {
                    var bacllist = new Bucket.BUCKET_Property(bucketname);
                    bacllist.GetPolicy(function(replytextp){
                        delete bacllist;
                        if(!replytextp){
                            var error = Hapi.error.badRequest('NotSuchBucketPolicy');
                                error.output.statusCode = 4044;
                                error.reformat();
                                reply(error);
                        }else{
                            return reply(replytextp).code(200)
                            .type('application/xml')
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');
                        }    
                    });
                }
                
                var bacllist = new Bucket.BUCKET_Property(bucketname);
                is_search_query = true;
                if(request.query.prefix !== undefined){
                    //bacllist.SetSearch_Prefix(request.query.prefix);
                }
                if(request.query.marker !== undefined){ //pagination
                    //bacllist.SetSearch_Marker(request.query.marker);
                }
                if(request.query['max-keys'] !== undefined) { //by default max is 1000 and if user ask for less, we can give numbers
                    //bacllist.SetSearch_MaxKeys(request.query['max-keys']);
                }
                if(request.query.delimiter !== undefined) { //suspended right now
                    //bacllist.SetSearch_Delimiter(request.query.delimiter);
                }
                if(request.query.prefix !== undefined && request.query.delimiter !== undefined){

                }
                var fblist = new Object.OBJECT_LIST();

                fblist.GetSearchResults(bucketname, function (ferr, freply){
                    if(!ferr){
                        return reply(freply).code(200)
                        .type('application/xml')
                        .header("Server", configinfo.server.Name)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("Connection", 'Close');
                    }else{
                        var error = Hapi.error.badRequest('NotSuchBucketPolicy');
                        error.output.statusCode = 4044;
                        error.reformat();
                        reply(error);
                    }
                });
            }
            
            if(bucketname && ! _.size(request.query) && !objectname){
                var fblist = new Object.OBJECT_LIST();
                fblist.GetSearchResults(bucketname, function (ferr, freply){
                    if(!ferr){
                        return reply(freply).code(200)
                        .type('application/xml')
                        .header("Server", configinfo.server.Name)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("Connection", 'Close');
                    }else{
                        var error = Hapi.error.badRequest('NotSuchBucketPolicy');
                        error.output.statusCode = 4044;
                        error.reformat();
                        reply(error);
                    }
                });
            }
            
            if(!bucketname && _.size(request.query) >0)
            {
                if( request.query.zonelisting !== undefined) {
                    var builder = new xmljs.Builder({xmldec: {'version': '1.0', 'encoding': 'UTF-8'}});
                    var replytextt = builder.buildObject({"zoneList":{"zone":configinfo.zoneslist}});
                    return reply(replytextt).code(200)
                        .type('application/xml')
                        .header("Server", configinfo.server.Name)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("Connection", 'Close');
                }else
                    is_search_query = true;
            }
            else if(!bucketname){
                var bucketlist = new Bucket.BUCKET_LIST;
                bucketlist.SetOwner(authval[0], authval[4]);
                bucketlist.GetList(authval[0], function(err,result){
                    if(!err){
                        return reply(result).code(200)
                        .type('application/xml')
                        .header("Server", configinfo.server.Name)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("x-amz-request-id", bid)
                        .header("Connection", 'Close');
                    }else{
                        //need to define what error i should give
                        return reply().code(200)
                        .header("Server", configinfo.server.Name)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("x-amz-request-id", bid)
                        .header("Connection", 'Close');
                    }
                    delete bucketlist;
                });
            }
        }
    }
};

var ProcessPOST = {
    payload: {
        maxBytes:configinfo.maxuploadsize,
        output: 'data',
        parse : false
    },
    handler: function (request, reply) {
        var boinfo = Extract_Bucke_Object(configinfo.server.Host, request.url.hostname, request._pathSegments);
        var bucketname = boinfo[0];
        var objectname = boinfo[1];
        var authval = request.headers.authorization.split(":");
        var bid = _.random(1000,1000000000);

        var xml = request.payload.toString('utf8').toLowerCase();
        if(bucketname && objectname && _.size(request.query) >0 )
        {
            if( request.query.uploads !== undefined ) {
            //Cache-Control, Content-Disposition, Content-Encoding, Content-Type, Expires, x-amz-server-side -encryption,
            // x-amz-storage-class, x-amz-website -redirect-location, x-amz-acl, 
                var obj = new Object.OBJECT_Class(bucketname, objectname);
                var revalue = obj.InitiateMultiPartUpload();
                return reply(revalue).code(200)
                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                .header("x-amz-request-id", bid)
                .header("Server", configinfo.server.Name)
            }
            if(request.query.uploadId!== undefined && request.query.partNumber!== undefined) {
                var uploadlist = {};
                var uploadid   = request.query.uploadId;
                var obj = new Object.OBJECT_Class(bucketname, objectname);
                if(xml) {
                    var count = 0;
                    var document = new xmldoc.XmlDocument(xml);
                    if(document){
                        if(document.name === 'completemultipartupload') {
                            document.eachChild(function(multipart) {
                                uploadlist[multipart.valueWithPath('etag').replace(/\"/g,'')+"-"+multipart.valueWithPath('partnumber')] = 1;
                                if((document.children.length === _.size(uploadlist)) && (_.size(uploadlist)>0)){
                                    obj.CompleteMultiPartUpload(uploadid,uploadlist, function(error,response){
                                        if(error){
                                            var error = Hapi.error.badRequest('InlineDataTooLarge');
                                            error.output.statusCode = 4007;
                                            error.reformat();
                                            reply(error);
                                        }else {
                                            return reply(response).code(200).header("Server", configinfo.server.Name)
                                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                            .header("x-amz-request-id", bid)
                                            .header("Connection", 'Close');
                                        }
                                    });
                                }else{
                                    /// Need to reply for this error
                                }
                            });
                        }
                    }
                }
            }
        }
        else if(bucketname && objectname){
            //x-amz-storage-class should be ignored
            // Check for x-amz-acl
            //x-amz-grant-read,x-amz-grant-read-acp,and x-amz-grant-write-acp, x-amz-grant-full-control
            //Cache-Control, Content-Disposition, Content-Encoding, Expires, x-amz-meta- , x-amz-server-side-encryption
            //x-amz-website -redirect-location
            
            if(request.payload.length > 0){
                //go and check if bucket has versioning enabled if enabled, then pass a parameter in the put object and 0 for no version 1 for enable, default is 0
                var obj = new Object.OBJECT_Class(bucketname, objectname);                
                obj.PutObject(request.payload, bversion, function(perr, preply){
                    //console.log(perr);
                    if(perr === true){
                        return reply().code(400)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("x-amz-request-id", bid)
                        .header("Server", configinfo.server.Name)
                        .header("Connection", 'Close');
                    }
                    if(preply){
                        return reply().code(200)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("ETag" ,preply['MD5'])
                            .header("Server", configinfo.server.Name)
                            .header("Connection", 'Close');
                        //x-amz-version-id should have version id
                        //x-amz-expiration, x-amz-server-side -encryption
                    }
                });
            }
        }
        
        if(bucketname) {
            var xml = request.payload.toString('utf8').toLowerCase();
            if(xml){
                var count = 0;
                var document = new xmldoc.XmlDocument(xml);
                if(document){
                    if(document.name === 'delete') {
                        var isquite = document.valueWithPath('quiet');
                        var dlist = document.childrenNamed('object');
                        if(_.size(dlist) <= 1000){
                            var obj = new Object.OBJECT_Class;
                            obj.SetParentBucket(bucketname);
                            var DeleteResult=[];
                            for(var inx= 0; inx <_.size(dlist); inx++ )
                            {
                                var dk = dlist[inx].valueWithPath('key');
                                var dv = dlist[inx].valueWithPath('versionid');
                                if(dk){
                                    obj.SetKeyName(dk);
                                    obj.DeleteObject();
                                }
                            }
                            return reply(obj.GetMultiDeleteResult()).code(200).type('application/xml')
                            .header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');                    
                        }else{
                            var error = Hapi.error.badRequest('InlineDataTooLarge');
                            error.output.statusCode = 4007;
                            error.reformat();
                            reply(error);
                        }
                    }
                }
            }
        }
    }
};

var ProcessPUT = {
    payload: {
        maxBytes: configinfo.maxuploadsize,
        output: 'data',
        parse : false
    },
    handler: function (request, reply) {
        var authval = request.headers.authorization.split(":");
        var bid = _.random(10000,10000000000);
        
        var boinfo = Extract_Bucke_Object(configinfo.server.Host, request.url.hostname, request._pathSegments);
        var bucketname = boinfo[0];
        var objectname = boinfo[1];

        if(!bucketname){
            var error = Hapi.error.badRequest('InvalidBucketName');
            error.output.statusCode = 4009;
            error.reformat();
            reply(error); 
        }
        if(bucketname && objectname && _.size(request.query) >0 ) {
            if(request.query.acl !== undefined) {
                var xml = request.payload.toString('utf8').toLowerCase();
                var aclObj = {};
                var obj = new Object.OBJECT_Class(bucketname, objectname);                
                if(xml){
                    var count = 0;
                    var document = new xmldoc.XmlDocument(xml);
                    //console.log(document.children.length);
                    if(document){
                        if(document.name === 'accesscontrolpolicy') {
                            document.eachChild(function(acl) {
                                aclObj[count] = {};
                                aclObj[count].id = acl.valueWithPath('id');
                                aclObj[count].displayname = acl.valueWithPath('displayname');
                                aclObj[count].permission = acl.valueWithPath('permission');

                                count++;
                                if(count === document.children.length)
                                {
                                    obj.setObjAcl(aclObj, function(err, msg){
                                        if(!err){
                                            return reply().code(400)
                                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                            .header("x-amz-request-id", bid)
                                            .header("ETag", ureply)
                                            .header("Server", configinfo.server.Name)
                                            .header("Connection", 'Close');
                                        }else{
                                            var error = Hapi.error.badRequest('InvalidObjectState');
                                            error.output.statusCode = 4033;
                                            error.reformat();
                                            reply(error);
                                        }
                                    });        
                                }
                            });
                        }
                    }
                }
            }
            if((request.query.uploadId !== undefined) && (request.query.partNumber !== undefined)) {
                if(request.payload.length >= 5242880){
                    var obj = new Object.OBJECT_Class(bucketname, objectname);                
                    if(parseInt(request.query.partNumber)<1000) {    
                        obj.UploadPart(request.query.uploadId, request.query.partNumber, request.payload, function(uerr, ureply){
                            if(!uerr){
                                return reply().code(400)
                                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                .header("x-amz-request-id", bid)
                                .header("ETag", ureply)
                                .header("Server", configinfo.server.Name)
                                .header("Connection", 'Close');
                            }else{
                                var error = Hapi.error.badRequest('NoSuchUpload');
                                error.output.statusCode = 4045;
                                error.reformat();
                                reply(error);
                            }
                        });
                    } else  {
                        var error = Hapi.error.badRequest('TooManyUploadPart');
                            error.output.statusCode = 4046;
                            error.reformat();
                            reply(error);
                    }
                }
            }
        }
        if(bucketname && objectname){
            //x-amz-storage-class should be ignored
            // Check for x-amz-acl
            //x-amz-grant-read,x-amz-grant-read-acp,and x-amz-grant-write-acp, x-amz-grant-full-control
            //Cache-Control, Content-Disposition, Content-Encoding, Expires, x-amz-meta- , x-amz-server-side-encryption
            //x-amz-website -redirect-location
            
            if(request.payload.length > 0 && request.query.uploadId === undefined){
                var obj = new Object.OBJECT_Class(bucketname, objectname);
                var bacllist = new Bucket.BUCKET_Property(bucketname);
                bacllist.VersionEnable(function(bversion){
                    //console.log("bversion in activeufs"+bversion);
                    bacllist.IsBucketExist( function (isexist){
                        if(!isexist) {
                            var error = Hapi.error.badRequest('InvalidBucketState');
                            if(parseInt(error) === 4094){
                                error.output.statusCode = 4094;                                    
                            }else{
                                error.output.statusCode = 409;
                            }
                            error.reformat();
                            return reply(error);
                        } else {    
                            obj.PutObject(request.payload, bversion, function(perr, preply){
                                if(perr === true){
                                    return reply().code(400)
                                    .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                    .header("x-amz-request-id", bid)
                                    .header("Server", configinfo.server.Name)
                                    .header("Connection", 'Close');
                                }
                                if(preply){
                                    return reply().code(200)
                                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                        .header("x-amz-request-id", bid)
                                        .header("ETag" ,preply['ETAG'])
                                        .header("Server", configinfo.server.Name)
                                        .header("Connection", 'Close');
                                    //x-amz-version-id should have version id
                                    //x-amz-expiration, x-amz-server-side -encryption
                                }
                            });
                        }
                    });
                });
            }
        } else{
            if(bucketname && _.size(request.query) >0)
            {
                var xml = request.payload.toString('utf8').toLowerCase(); 
                if( request.query.acl !== undefined ) {
                    //Need to do the XML processing and implement on Bucket
                    if(request.headers['x-amz-acl']) {
                        // NEED FOR VER .5
                    }
                    if(request.headers['x-amz-grant-read']) {
                        // NEED FOR VER .5
                    }
                    if(request.headers['x-amz-grant-write']) {
                        // NEED FOR VER .5
                    }
                    if(request.headers['x-amz-grant-read-acp']) {
                        // NEED FOR VER .5
                    }
                    if(request.headers['x-amz-grant-write-acp']) {
                        // NEED FOR VER .5
                    }
                    if(request.headers['x-amz-grant-full-control']) {
                        // NEED FOR VER .5
                    }                         
                    if(xml){
                        var document = new xmldoc.XmlDocument(xml);
                        if(document) {
                            var buck_info = new Bucket.BUCKET_Property(bucketname);
                            if(document.name.toLowerCase() === 'accesscontrolpolicy') {
                                if(document.valueWithPath('owner.id') && document.valueWithPath('owner.displayname')){
                                    // This is a big security issue that need to investigate further.. as we are not sure its correct
                                    //buck_info.SetOwner(document.valueWithPath('owner.id'), document.valueWithPath('owner.displayname'));
                                    buck_info.ClearAllPermissions(function(err,msg){
                                        if(!err){
                                            var error = Hapi.error.badRequest('InformationNotAvailable');
                                            error.output.statusCode = 4096;
                                            error.reformat();
                                            reply(error);
                                        }
                                    });
                                }
                                var accessctrl = document.childNamed('accesscontrollist');
                                if(accessctrl){
                                    var grantlist = accessctrl.childrenNamed('grant');
                                    for(var inx= 0; inx <grantlist.length; inx++ )
                                    {
                                        if(grantlist[inx].valueWithPath('grantee.id')){
                                            buck_info.GrantPermissionbyID(grantlist[inx].valueWithPath('grantee.id'),
                                            grantlist[inx].valueWithPath('grantee.displayid'),
                                            grantlist[inx].valueWithPath('permission').toUpperCase(), 
                                            function(errr, msg){
                                                 // NEED FOR VER .5  This need fix and we never throw 500 error
                                                if(err) {
                                                    var error = Hapi.error.badRequest('InformationNotAvailable');
                                                    error.output.statusCode = 4096;
                                                    error.reformat();
                                                    reply(error);
                                                }
                                            });
                                        }
                                        if(grantlist[inx].valueWithPath('grantee.emailaddress')){
                                            buck_info.GrantPermissionbyEmail(grantlist[inx].valueWithPath('grantee.emailaddress'), grantlist[inx].valueWithPath('permission').toUpperCase(), 
                                                function(err,msg){
                                                    // NEED FOR VER .5  This need fix and we never throw 500 error
                                                    if(err) {
                                                        var error = Hapi.error.badRequest('InformationNotAvailable');
                                                        error.output.statusCode = 4096;
                                                        error.reformat();
                                                        reply(error);
                                                    }
                                            });
                                        }
                                        if(grantlist[inx].valueWithPath('grantee.uri')){
                                            buck_info.GrantPermissionByURI(grantlist[inx].valueWithPath('grantee.uri'), grantlist[inx].valueWithPath('permission').toUpperCase(), function(err,msg){
                                                // NEED FOR VER .5  This need fix and we never throw 500 error                                                    
                                                if(err)
                                                {
                                                    var error = Hapi.error.badRequest('InformationNotAvailable');
                                                    error.output.statusCode = 4096;
                                                    error.reformat();
                                                    reply(error);
                                                }
                                            });
                                        }
                                    }
                                    delete grantlist;
                                    delete accessctrl;
                                }else{
                                    // NEED FOR VER .5  Throw proper error
                                    console.log('Invalid input');
                                }
                            }
                            delete document;
                        }
                    }
                }
                if( request.query.cors !== undefined ) {
                    // NEED to support in future
                }
                if( request.query.lifecycle !== undefined ) {
                    var buck_info = new Bucket.BUCKET_Property(bucketname);
                    if(xml){
                        var document = new xmldoc.XmlDocument(xml);
                        if(document) {
                            if(document.name.toLowerCase() === 'lifecycleconfiguration') {
                                if(document.valueWithPath('rule.transition.days')){
                                    buck_info.SetLifecycleConfig_Day(
                                        document.valueWithPath('rule.id'),
                                        document.valueWithPath('rule.prefix'),
                                        document.valueWithPath('rule.status'),
                                        document.valueWithPath('rule.transition.days'),
                                        document.valueWithPath('rule.transition.storageclass'),
                                        document.valueWithPath('rule.expiration.days'), function(err, msg){
                                            if(err) {
                                                var error = Hapi.error.badRequest('NoSuchLifecycleConfiguration');
                                                        error.output.statusCode = 4042;
                                                        error.reformat();
                                                        reply(error);
                                            }
                                        });
                                }
                                if(document.valueWithPath('rule.transition.date')){
                                    buck_info.SetLifecycleConfig_Date(
                                        document.valueWithPath('rule.id'),
                                        document.valueWithPath('rule.prefix'),
                                        document.valueWithPath('rule.status'),
                                        document.valueWithPath('rule.transition.date'),
                                        document.valueWithPath('rule.transition.storageclass'),
                                        document.valueWithPath('rule.expiration.days') , function(err, msg){
                                        if(err){
                                                var error = Hapi.error.badRequest('InformationNotAvailable');
                                                error.output.statusCode = 4096;
                                                error.reformat();
                                                reply(error);
                                            }
                                        });
                                }
                            }
                            delete document;
                        }
                    }
                    if(buck_info) delete buck_info;
                }
                if( request.query.policy !== undefined ) {
                    //Need to do the XML processing and implement on Bucket
                    var buck_info = new Bucket.BUCKET_Property(bucketname);
                    if(xml){
                        var document = new xmldoc.XmlDocument(xml);
                        if(document) {
                            if(document.name === 'notificationconfiguration') {
                                console.log(document.valueWithPath('TopicConfiguration.Topic'));
                                console.log(document.valueWithPath('TopicConfiguration.Event'));                                
                            }
                            delete document;
                        }
                    }
                    if(buck_info) delete buck_info;
                }
                if( request.query.logging !== undefined ) {
                    //Need to do the XML processing and implement on Bucket
                    var buck_info = new Bucket.BUCKET_Property(bucketname);
                    if(xml){
                        var document = new xmldoc.XmlDocument(xml);
                        if(document) {
                            if(document.name === 'bucketloggingstatus') {
                                buck_info.SetLogConfig(document.valueWithPath('loggingenabled.targetbucket'), document.valueWithPath('loggingenabled.targetprefix'), function(err,msg){
                                    if(!err){
                                        var le = document.childNamed('loggingenabled');
                                        var tgrant = le.childrenNamed('targetgrants');
                                        
                                        // NEED FOR VER .5  something is missing and need to set reply or handle this properly
                                    }
                                });
                            }
                            delete document;
                        }
                    }
                    if(buck_info) delete buck_info;
                }
                if( request.query.notification !== undefined ) {
                    var buck_info = new Bucket.BUCKET_Property(bucketname);
                    if(xml){
                        var document = new xmldoc.XmlDocument(xml);
                        if(document) {
                            if(document.name === 'notificationconfiguration') {
                                console.log(document);
                                console.log(document.valueWithPath("topicconfiguration.topic"));
                                console.log(document.valueWithPath("topicconfiguration.event"));
                                // NEED FOR VER .5  Set as bucket property and  send reply or handle this properly
                            }
                            delete document;
                        }
                    }
                    if(buck_info) delete buck_info;
                }
                if( request.query.tagging !== undefined ) {
                    var buck_info = new Bucket.BUCKET_Property(bucketname);
                    if(xml){
                        var document = new xmldoc.XmlDocument(xml);
                        if(document){
                            if(document.name === 'tagging') {
                                var tkv = {};
                                var tlist = document.childNamed('tagset');
                                for(var inx= 0; inx <tlist.children.length; inx++ ) {
                                    var tk = tlist.children[inx].valueWithPath('key');
                                    var tv = tlist.children[inx].valueWithPath('value');
                                    if(tk && tv)
                                        tkv[tk] = tv;
                                }
                                if(_.size(tkv) > 0){
                                    buck_info.SetTag(tkv, function(error,msg){
                                        if(error) {
                                            var error = Hapi.error.badRequest('InformationNotAvailable');
                                            error.output.statusCode = 4096;
                                            error.reformat();
                                            reply(error);
                                        }

                                    });
                                } else {
                                    buck_info.DeleteTag(function(err,msg){
                                        if(err)
                                        {
                                            var error = Hapi.error.badRequest('InformationNotAvailable');
                                            error.output.statusCode = 4096;
                                            error.reformat();
                                            reply(error);
                                        }
                                    });
                                }
                                delete tkv;
                                delete tlist;
                            }
                            delete document;
                        }
                    }
                    if(buck_info) delete buck_info;
                }
                if( request.query.requestPayment !== undefined ) {
                    var buck_info = new Bucket.BUCKET_Property(bucketname);
                    if(xml){
                        var document = new xmldoc.XmlDocument(xml);
                        if(document) {
                            if(document.name === 'requestpaymentconfiguration') {
                                console.log(document.valueWithPath('payer'));
                                buck_info.SetReqPayerConfig(document.valueWithPath('payer'), function(err,msg){
                                    if(!err)
                                    {
                                        delete document;
                                    }
                                    else
                                    {
                                        // NEED FOR VER .5  Set as bucket property and  send reply or handle this properly
                                        var error = Hapi.error.badRequest('InformationNotAvailable');
                                        error.output.statusCode = 4096;
                                        error.reformat();
                                        reply(error);
                                    }
                                });
                            }
                            
                        }
                    }
                    delete buck_info;
                }
                if( request.query.versioning !== undefined ) {
                    //Need to do the XML processing and implement on Bucket
                    var buck_info = new Bucket.BUCKET_Property(bucketname);
                    if(xml){
                        var document = new xmldoc.XmlDocument(xml);
                        if(document) {
                            if(document.name === 'versioningconfiguration') {
                                if(request.headers['x-amz-mfa'] && document.valueWithPath('mfadelete') && document.valueWithPath('status')){
                                    if(document.valueWithPath('mfadelete') === 'enabled')
                                        buck_info.SetVersionMfadel(true, function(err, msg){
                                            if(err) {
                                                var error = Hapi.error.badRequest('InformationNotAvailable');
                                                    error.output.statusCode = 4096;
                                                    error.reformat();
                                                    reply(error);        
                                           }
                                        });
                                    if(document.valueWithPath('mfadelete') === 'disabled')
                                        buck_info.SetVersionMfadel(false, function(err, msg){
                                           if(err) {
                                                // NEED FOR VER .5  Set as bucket property and never throw 500
                                                var error = Hapi.error.badRequest('InformationNotAvailable');
                                                    error.output.statusCode = 4096;
                                                    error.reformat();
                                                    reply(error);        
                                           }
                                        });
                                }
                                if(document.valueWithPath('status')){
                                    if(document.valueWithPath('status') === 'enabled') {
                                        buck_info.SetVersioning(true, function(err, msg){
                                            if(err) {
                                                // NEED FOR VER .5  Set as bucket property and never throw 500
                                                var error = Hapi.error.badRequest('InformationNotAvailable');
                                                    error.output.statusCode = 4096;
                                                    error.reformat();
                                                    reply(error);        
                                           }
                                        });
                                    }
                                    if(document.valueWithPath('status') === 'suspended'){
                                        buck_info.SetVersioning(false, function(err, msg){
                                            if(err) {
                                                // NEED FOR VER .5  Set as bucket property and never throw 500
                                                var error = Hapi.error.badRequest('InformationNotAvailable');
                                                    error.output.statusCode = 4096;
                                                    error.reformat();
                                                    reply(error);
                                            }
                                        });
                                    }
                                }
                            }
                            delete document;
                        }
                    }
                    if(buck_info) delete buck_info;
                }
                if( request.query.website !== undefined ) {
                    //Need to do the XML processing and implement on Bucket
                    var buck_info = new Bucket.BUCKET_Property(bucketname);
                    if(xml){
                        var document = new xmldoc.XmlDocument(xml);
                        if(document) {
                            if(document.name === 'websiteconfiguration') {
                                if(document.valueWithPath('indexdocument.suffix') && document.valueWithPath('errordocument.key')){
                                    buck_info.SetWebConfig(document.valueWithPath('indexdocument.suffix'),document.valueWithPath('errordocument.key'), function(error, msg){
                                        if(error) {
                                            // NEED FOR VER .5  Set as bucket property and never throw 500
                                            var error = Hapi.error.badRequest('InformationNotAvailable');
                                                error.output.statusCode = 4096;
                                                error.reformat();
                                                reply(error);        
                                        }
                                    });
                                } else if(document.valueWithPath('indexdocument.suffix')){
                                    buck_info.SetWebConfig(document.valueWithPath('indexdocument.suffix'), function(error, msg){
                                        if(error){
                                            // NEED FOR VER .5  Set as bucket property and never throw 500
                                            var error = Hapi.error.badRequest('InformationNotAvailable');
                                                error.output.statusCode = 4096;
                                                error.reformat();
                                                reply(error);        
                                           }
                                    });
                                }
                                var routelist = document.childNamed('routingrules');
                                if(routelist){
                                    for(var inx= 0; inx <routelist.children.length; inx++ )
                                    {
                                        var cond_kp = routelist.children[inx].valueWithPath('condition.keyprefixequals');
                                        var repl_kp = routelist.children[inx].valueWithPath('redirect.replacekeyprefixwith');

                                        if(cond_kp && repl_kp){
                                            buck_info.SetWebRouteForPrefix(cond_kp, repl_kp, function(err,msg){
                                                if(err){
                                                    var error = Hapi.error.badRequest('PreconditionFailed');
                                                    error.output.statusCode = 412;
                                                    error.reformat();
                                                    reply(error);
                                                }
                                            });
                                        }

                                        var cond_cd = routelist.children[inx].valueWithPath('condition.httperrorcodereturnedequals');
                                        var repl_hn = routelist.children[inx].valueWithPath('redirect.hostname');
                                        var repl_rk = routelist.children[inx].valueWithPath('redirect.replacekeyprefixwith');

                                        if(cond_cd && repl_hn && repl_rk){
                                            buck_info.SetWebRouteForErrCode(cond_cd, repl_hn, repl_rk, function(err,msg){
                                                if(err){
                                                    var error = Hapi.error.badRequest('PreconditionFailed');
                                                    error.output.statusCode = 412;
                                                    error.reformat();
                                                    reply(error);
                                                }
                                            });
                                        }
                                    }
                                    delete routelist;
                                }
                                if(document.valueWithPath('redirectallrequeststo.hostname'))
                                    buck_info.SetWebRedirect(document.valueWithPath('redirectallrequeststo.hostname'), function(err,msg){
                                        if(err) {
                                            var error = Hapi.error.badRequest('InformationNotAvailable');
                                                error.output.statusCode = 4096;
                                                error.reformat();
                                                reply(error);        
                                        }
                                    });
                            }
                            delete document;
                        }
                    }
                    delete buck_info;
                }
                return reply().code(200).header("Server", configinfo.server.Name)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("x-amz-request-id", bid)
                        .header("Connection", 'Close');
            }
            else if(bucketname && _.size(request.query) === 0){
                if(!CheckBucketName(bucketname)){
                    var error = Hapi.error.badRequest('BucketAlreadyExists');
                    error.output.statusCode = 4095;
                    error.reformat();
                    reply(error);
                }
                var bacllist = new Bucket.BUCKET_Property(bucketname);
                bacllist.IsBucketExist(function (isexist){
                    if(!isexist){
                        // Remember Auth 4 have one extra param and we should autheticate the outgoing request which we are not doing
                        bacllist.CreateBucket(authval[0],authval[4], function(err, msg){
                            if(!err){
                                delete bacllist;
                                return reply().code(200).header("Server", configinfo.server.Name)
                                    .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                    .header("x-amz-request-id", bid)
                                    .header("Connection", 'Close');
                            }else{
                                var error = Hapi.error.badRequest('InvalidBucketState');
                                error.output.statusCode = 409;
                                error.reformat();
                                reply(error);
                            }
                        });
                    }else{
                        var error = Hapi.error.badRequest('BucketAlreadyExists');
                        error.output.statusCode = 4095;
                        error.reformat();
                        reply(error);
                    }
                });
            }
        }
    }
};

var ProcessDELETE = {
    payload: {
        maxBytes:1048576,
        output: 'data',
        parse : false
    },
    handler: function (request, reply) {
        var bid = _.random(1000,1000000000);
        var boinfo = Extract_Bucke_Object(configinfo.server.Host, request.url.hostname, request._pathSegments);
        var bucketname = boinfo[0];
        var objectname = boinfo[1];
        var versionId  = false;

        var authval = request.headers.authorization.split(":");
        if(bucketname && objectname){  
            // handle x-amz-mfa
            // Handle XML respose too for multi object
            var obj = new Object.OBJECT_Class(bucketname, objectname);
            if( request.query.versionId !== undefined ) {
                versionId = request.query.versionId;
            }

            obj.DeleteObject(versionId, function(error){
                if(error) {
                    var error = Hapi.error.badRequest('NoSuchKey');
                    error.output.statusCode = 404;
                    error.reformat();
                    reply(error);
                } else {
                    //x-amz-delete-marker
                    //x-amz-version-id
                    return reply().code(204).header("Server", configinfo.server.Name)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("x-amz-request-id", bid)
                        .header("Connection", 'Close');
                }
            });
        } else {
            if(bucketname && _.size(request.query) >0 ){
                var buck_info = new Bucket.BUCKET_Property(bucketname);
                if( request.query.uploadId !== undefined ) {
                    var obj = new Object.OBJECT_Class(bucketname, objectname);
                    obj.AbortMultiPartUpload(request.query.uploadId, function(error){
                        if(error) {
                            var error = Hapi.error.badRequest('InformationNotAvailable');
                            error.output.statusCode = 4096;
                            error.reformat();
                            reply(error);
                        } else {
                            return reply().code(204).header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');
                        }
                    });
                }
                if( request.query.cors !== undefined ) {
                    return reply().code(204).header("Server", configinfo.server.Name)
                        // NEED FOR VER .5  need to delete this property
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("x-amz-request-id", bid)
                        .header("Connection", 'Close');
                }
                if( request.query.lifecycle !== undefined ) {
                        // NEED FOR VER .5  need to delete this property
                    return reply().code(204).header("Server", configinfo.server.Name)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("x-amz-request-id", bid)
                        .header("Connection", 'Close');            
                }
                if( request.query.policy !== undefined ) {
                        // NEED FOR VER .5  need to delete this property
                    return reply().code(204).header("Server", configinfo.server.Name)
                        .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                        .header("x-amz-request-id", bid)
                        .header("Connection", 'Close');            
                }
                if( request.query.tagging !== undefined ) {
                    buck_info.DeleteTag(function(error, msg){
                        if(!error) {
                            return reply().code(204).header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');            
                        } else {
                            var error = Hapi.error.badRequest('InformationNotAvailable');
                            error.output.statusCode = 4096;
                            error.reformat();
                            reply(error);
                        }
                    });    
                }
                if( request.query.website !== undefined ) {
                    buck_info.DeleteWebsite(function(error, msg){
                        if(!error) {
                            return reply().code(204).header("Server", configinfo.server.Name)
                            .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                            .header("x-amz-request-id", bid)
                            .header("Connection", 'Close');            
                        } else {
                            var error = Hapi.error.badRequest('InformationNotAvailable');
                            error.output.statusCode = 4096;
                            error.reformat();
                            reply(error);
                        }
                    });
                }
            }
            if(bucketname){
                var xml = request.payload.toString('utf8').toLowerCase();
                if(xml)
                {
                    var count = 0;
                    var document = new xmldoc.XmlDocument(xml);
                    if(document){
                        if(document.name === 'delete') {
                            var isquite = document.valueWithPath('quiet');
                            var dlist = document.childrenNamed('object');
                            if(_.size(dlist) <= 1000){
                                var obj = new Object.OBJECT_Class;
                                obj.SetParentBucket(bucketname);
                                var DeleteResult=[];
                                for(var inx= 0; inx <_.size(dlist); inx++ )
                                {
                                    var dk = dlist[inx].valueWithPath('key');
                                    var dv = dlist[inx].valueWithPath('versionid');
                                    if(dk){
                                        obj.SetKeyName(dk);
                                        obj.DeleteObject();
                                    }
                                }
                                return reply(obj.GetMultiDeleteResult()).code(200).type('application/xml')
                                .header("Server", configinfo.server.Name)
                                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                .header("x-amz-request-id", bid)
                                .header("Connection", 'Close');                    
                            }else{
                                var error = Hapi.error.badRequest('InlineDataTooLarge');
                                error.output.statusCode = 4007;
                                error.reformat();
                                reply(error);
                            }
                        }
                    }
                }
            }
            if(bucketname && !_.size(request.query) && !objectname ) {
                var bacllist = new Bucket.BUCKET_Property(bucketname);
                bacllist.IsBucketExist(function (isexist){
                    if(isexist){
                        bacllist.RemoveBucket(authval[0], function (error, result){
                            delete bacllist;
                            if(!error){
                                return reply().code(204).header("Server", configinfo.server.Name)
                                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                                .header("x-amz-request-id", bid)
                                .header("Connection", 'Close');
                            }else{
                                var error = Hapi.error.badRequest('InvalidBucketState');
                                if(parseInt(error) === 4094){
                                    error.output.statusCode = 4094;                                    
                                }else{
                                    error.output.statusCode = 409;
                                }
                                error.reformat();
                                return reply(error);
                            }
                        });
                    } else{
                        var error = Hapi.error.badRequest('NoSuchBucket');
                        error.output.statusCode = 4041;
                        error.reformat();
                        return reply(error);
                    }
                });
            }
            if(!bucketname){
                var error = Hapi.error.badRequest('InvalidBucketName');
                error.output.statusCode = 4009;
                error.reformat();
                return reply(error);
            }
        }
    }
};

var ProcessOPTIONS = {
    handler: function (request, reply) {
        
        var bid = _.random(1000,1000000000);
        var boinfo = Extract_Bucke_Object(configinfo.server.Host, request.url.hostname, request._pathSegments);
        var bucketname = boinfo[0];
        var objectname = boinfo[1];
        
        var authval = request.headers.authorization.split(":");
        if(bucketname && objectname) {
            var obj = new Object.OBJECT_Class(bucketname, objectname);
            obj.IsObjectExist(null, function(err, meta){
                var metad = meta.split("#");
                if(!err){
                    var retobj = reply().code(200).header("Server", configinfo.server.Name)
                    .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                    .header("ETag", metad[2])
                    .header("x-amz-request-id", bid);
            
                    if(request.headers["Origin"]){
                        // NEED TO FIX in .5
//                        retobj.header("Access-Control-Allow-Origin", "http://www.example.com")
                    }
                    if(request.headers["Access-Control-Request-Method"]){
                        retobj.header("Access-Control-Allow-Methods", "GET, PUT, DELETE");
                    }
                    if(request.headers["Access-Control-Request-Headers"]){
                        retobj.header("Access-Control-Expose-Headers", 'x-amz-request-id');
                    }
                    retobj.header("Connection", 'Close');
                    return retobj;
//                  NEED TO FIX SOON:  Need to add: Content-Type: text/plain
                }else{
                    delete obj;
                    var error = Hapi.error.badRequest('NoSuchKey');
                    error.output.statusCode = 404;
                    error.reformat();
                    reply(error);
                }
            });
        }
        
        if(!bucketname){
            var errobj = new Errors.Error_Class;
            errobj.SetCode('InvalidBucketName');
            errobj.SetMessage('The specified bucket is not valid. 400 Bad Request');
            errobj.SetRequestId(bid);
            var xml = errobj.GetError();

            return reply(xml).code(409).header("Server", configinfo.server.Name)
                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                .header("x-amz-request-id", bid)
                .header("Connection", 'Close');
        }
// NEED TO FIX for .5
//        else{
//
//            return reply().code(204).header("Server", configinfo.server.Name)
//                .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
//                .header("x-amz-request-id", bid)
//                .header("Connection", 'Close');
//        }

    }
};

var WebserverOPTIONS = {
    handler: function (request, reply) {
        var request1 = _.clone(request);
        var boinfo = Extract_Bucke_Object(configinfo.server.Host, request1.url.hostname, request1._pathSegments);
        var bucketname = boinfo[0];
        var objectname = boinfo[1];

        var objg = new Object.OBJECT_Class(bucketname, objectname);
        objg.GetObject(null, function(err, meta, objdata){
            if(err){
                // NEED FOR VER .5  Throw proper error
            }else{
                // NEED FOR VER .5  content type should come from the call and shoule be return properly for each type
                return reply(objdata).header("Content-Type", 'image/jpeg');
            }
        });
    }
};

//console.log(configinfo);
if (cluster.isMaster) {
    console.log("*********************************************************");
    console.log("Active UFS Server is Starting");
    console.log("*********************************************************");
    if(configinfo.debug){
        console.log("Server Configuration of current Server:");
        console.log("CPU Information",cpuinfo);
        console.log("Network Information", netinfo);
        console.log("Memory Information", meminfo);
        console.log("OS Information", osinfo);        
    }
    for (var i = 0; i < numCPUs; i++) {
        cluster.setupMaster({
      //  exec : "worker.js",
      //  args : ["--use", "https"],
            silent : false
        });
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        cluster.fork();
        if(configinfo.debug){ console.log('%s %d died (%s). restarting...', configinfo.comapanyName, worker.process.pid, signal||code ); }
    });    

} else {

    var server = null;
    var WebServer = null;
    if(configinfo.isSecure)
    {
        server = new Hapi.Server(configinfo.server.Host,  configinfo.server.Port, { cors: false,  maxSockets:1, timeout: {client: configinfo.requesttimeout, server: configinfo.requesttimeout, socket:configinfo.requesttimeout+5}, tls:optionpriv});    
        WebServer = new Hapi.Server(configinfo.server.Host, configinfo.WebServer.Port, { cors: false,  maxSockets:1, timeout: {client: configinfo.requesttimeout, server: configinfo.requesttimeout, socket:configinfo.requesttimeout+5}, tls:optionpriv});
    }
    else
    {
        server = new Hapi.Server(configinfo.server.Host, configinfo.server.Port, { cors: false,  maxSockets:1, timeout: {client: configinfo.requesttimeout, server: configinfo.requesttimeout, socket:configinfo.requesttimeout+5}});
        WebServer = new Hapi.Server(configinfo.server.Host, configinfo.WebServer.Port, { cors: false,  maxSockets:1, timeout: {client: configinfo.requesttimeout, server: configinfo.requesttimeout, socket:configinfo.requesttimeout+5}});
    }

    server.ext('onRequest', function (request, next) {
        if(request.headers.authorization)
        {
            var authvar = request.headers.authorization.split(' ');
            if(authvar[0] === 'AWS') {
                var key_val = authvar[1].split(':');
                if( key_val[1] === undefined){
                    var error = Hapi.error.badRequest('KeyTooLong');
                    error.output.statusCode = 40019;
                    error.reformat();
                    next(error);
                } else {
                    var cdate = request.headers.date || '';

                    if(_.contains(WhiteList , request.url.search) || request.url.query.versionId ||(request.url.query.partNumber || request.url.query.uploadId) ) // this.kname
                        var res_info = request.url.path|| '';
                    else
                        var res_info = request.url.pathname|| '';
                    
                    var ctype = request.headers['content-type'] || '';
                    var chash = request.headers['content-MD5'] || '';
                    
                    
                    var cmzheader = clientAuth.GetCanonicalizedAmzHeaders(request.headers);
                    clientAuth.AuthenticateRequest(key_val[0], request.method, cdate, cmzheader, res_info, ctype, chash, key_val[1],  function(err, retval){
                        if(!err){
                            request.headers.authorization = retval;
                            next();
                        }else{
                            if(parseInt(retval) === 4032){
                                var error = Hapi.error.badRequest('InvalidAccessKeyId');
                                error.output.statusCode = 4032;
                                error.reformat();
                                next(error);
                            }
                            if(parseInt(retval) === 4039){
                                var error = Hapi.error.badRequest('SignatureDoesNotMatch');
                                error.output.statusCode = 4039;
                                error.reformat();
                                next(error);
                            }
                        }
                    });
                }
            } else {
                request.headers.authorization = null;
                var error = Hapi.error.badRequest('AccountProblem');
                error.output.statusCode = 4031;
                error.reformat();
                next(error);
            }
        } else {
            request.headers.authorization = null;
            error = Hapi.error.badRequest('AccessDenied');
            error.output.statusCode = 403;
            error.reformat();
            next(error);
        }
    });

    server.ext('onPreResponse', function (request, next) {
        var response = request.response;
        if(request.headers.authorization){
            var authval = request.headers.authorization.split(":");
            if (!response.isBoom) {
                return next();
            }
            if (response.isBoom){
                var errobj = new Errors.Error_Class;
                errobj.GetErrorMsg(response.output.statusCode);
                if(response.output.payload.custom){
                    if(response.output.payload.custom['RequestId']) errobj.SetRequestId(response.output.payload.custom['RequestId']);
                    if(response.output.payload.custom['Resource']) errobj.SetResource(response.output.payload.custom['Resource']);
                }
                return next(errobj.GetError())
                    .code(errobj.GetNumCode())
                    .header("Server", configinfo.server.Name)
                    .header("x-amz-id-2", GetAuthorizeKey(authval[0], authval[1], authval[2]))
                    .header("Connection", 'Close');
            }
        }else{
            var errobj = new Errors.Error_Class;
            errobj.GetErrorMsg(400);
            return next(errobj.GetError())
            .code(errobj.GetNumCode())
            .header("Server", configinfo.server.Name)
            .header("Connection", 'Close');
        }
    });

    WebServer.route({ method: 'GET', path: '/{p*}', config: WebserverOPTIONS });

    server.route({  method: 'GET', path: '/', config: ProcessGETHEAD });
    server.route({  method: 'GET', path: '/{p*}', config: ProcessGETHEAD });

    server.route({  method: 'PUT', path: '/', config: ProcessPUT });
    server.route({  method: 'PUT', path: '/{p*}', config: ProcessPUT });

    server.route({  method: 'POST', path: '/', config: ProcessPOST });
    server.route({  method: 'POST', path: '/{p*}', config: ProcessPOST });

    server.route({  method: 'DELETE', path: '/', config: ProcessDELETE });
    server.route({  method: 'DELETE', path: '/{p*}', config: ProcessDELETE });

    server.route({  method: 'OPTIONS', path: '/', config: ProcessOPTIONS});
    server.route({  method: 'OPTIONS', path: '/{p*}', config: ProcessOPTIONS});

    server.start();
    WebServer.start();
    if(configinfo.debug)
        console.log("\nActiveScaler Server Cluster "+ cluster.worker.id + " Loaded. Load time: "+(new Date().getTime() - starttime));
}