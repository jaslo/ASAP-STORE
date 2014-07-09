var xmljs = require('xml2js');
var defineClass = require("./defineClass.js").defineClass;
var fs = require('fs-extra');

var _ = require('underscore');
var theredis = require('then-redis');
var configinfo = require('./config.js');

var crypto = require('crypto');
var bucket_list_str = "blist";
var file_list_str = "flist-";

var bhtaccess = '.htaccess';
var htaccess_index = ["DirectoryIndex "];
var htaccess_errors = ["ErrorDocument 400 ", "ErrorDocument 401 ", "ErrorDocument 403 ", "ErrorDocument 404 "];
var htaccess_redir = ["Redirect "];

var xamzacl = Array('private', "public-read", "public-read-write", "authenticated-read", "bucket-owner-read", "bucket-owner-full-control");
var xamzaclkey = Array('x-amz-acl', 'x-amz-grant-read', 'x-amz-grant-write', 'x-amz-grant-read-acp', 'x-amz-grant-write-acp', 'x-amz-grant-full-control');

var xmlns = 'http://s3.amazonaws.com/doc/2006-03-01/';
var xmlxsi = 'http://www.w3.org/2001/XMLSchema-instance';
var xmlxsitype = "CanonicalUser";

var asfsClass = require("./asfs.js");

var asfsObj = new asfsClass.ASFS_Class();

var db = theredis.createClient({
  host: configinfo.redis.host,
  port: configinfo.redis.port
});

var BUCKET_Property = defineClass({
    builder: '',
    xmlversion: '1.0',
    xmlencoding: 'UTF-8',
/*
READ            Allows grantee to list the objects in the bucket    Allows grantee to read the object data and its metadata
WRITE           Allows grantee to create, overwrite, and delete any object in the bucket    Not applicable
READ_ACP    Allows grantee to read the bucket ACL   Allows grantee to read the object ACL
WRITE_ACP   Allows grantee to write the ACL for the applicable bucket   Allows grantee to write the ACL for the applicable object
FULL_CONTROL    Allows grantee the READ, WRITE, READ_ACP, and WRITE_ACP permissions on the bucket   Allows grantee the READ, READ_ACP, and WRITE_ACP permissions on the object  
*/
ACL_PRIVATE     : 0, 
ACL_READ        : 1, 
ACL_WRITE       : 2, 
ACL_READ_ACP    : 4, 
ACL_WRITE_ACP   : 8, 
ACL_FULL_CONTROL: 15,

/*
private Bucket and object   Owner gets FULL_CONTROL. No one else has access rights (default).
public-read Bucket and object   Owner gets FULL_CONTROL. The AllUsers group ( see Who Is a Grantee?) gets READ access.
public-read-write   Bucket and object   Owner gets FULL_CONTROL. The AllUsers group gets READ and WRITE access. Granting this on a bucket is generally not recommended.
authenticated-read  Bucket and object   Owner gets FULL_CONTROL. The AuthenticatedUsers group gets READ access.
bucket-owner-read   Object  Object owner gets FULL_CONTROL. Bucket owner gets READ access. If you specify this canned ACL when creating a bucket, Amazon S3 ignores it.
bucket-owner-full-control   Object  Both the object owner and the bucket owner get FULL_CONTROL over the object. If you specify this canned ACL when creating a bucket, Amazon S3 ignores it.
log-delivery-write  Bucket  The LogDelivery group gets WRITE and READ_ACP permissions on the bucket. For more information on logs, see
*/
CACL_PRIVATE        : 0,
CACL_PUB_READ       : 1,
CACL_PUB_READ_WRITE : 2,
CACL_AUTH_READ      : 4,
CACL_BUCKET_READ    : 8,
CACL_BUCKET_FULL    : 16,
CACL_LOG            : 0,

READ        : "READ",
WRITE_ACP   : 'WRITE_ACP',
READ_ACP    : 'READ_ACP',
WRITE       : "WRITE",
FULL_CONTROL: "FULL_CONTROL",

VERSION_SUSPEND: 0,
VERSION_ENABLE: 1,
MFA_DISABLE: 0,
MFA_ENABLE: 1,
Bucket_name: '',
//  Owner must have ID and email
Owner: {},
//  Owner can allow ID, Email and permission    
Grantee: [],
isAclEnable: false,
    //aclObject:{'ID':'', 'DisplayName':''},
    aclObject: {},
    isCorsEnable: false,
    corsObject: {},
    isLogEnable: false,
    logObject: {},

    // This is for Route Rule
    isWebEnable: false,
    routeRules: [],

    // This is for Route Redir
    isWebredirEnable: false,
    redirRule:{},
    
    webObject: {},
    isReqpayEnable: false,
    reqPayer: {'Payer': ''},
    isVersionMfadel: false,
    isVersionEnable: false,
    versionObject: {},
    isNotifyEnable: false,
    notifyObject: {'enable': 0, 'Topic': '', 'Event': ''},
    isLifecycleEnable: false,
    lifecycleObject: {'enable': 0, 'count': 0, 'ID': '', 'Date': '', 'Days': 0, 'Expiration': 0, 'prefix': '', 'Rule': '', 'Status': 'Disabled', 'Transition': '', 'StorageClass': ''},
    isPolicyEnable: false,
    policyObject: {},
    isTagEnable: false,
    tagObject: [[]],
    locObject: 'us-east-1',
// Cors configuration    
corsrule: [],
// Define Bucket Notification    
Topic: [],
Event: [],
// Policy Engine    
Statement: {},
    //prefix, marker, maxkey, delimiter, IsTruncated
    Contents: [],
    Is_updated: false,
    result: [],
    succobj: [],
    errobj: [],
    bnameHash:'',
    constructor: function(bname) {
        this.Bucket_name = bname;
        this.bnameHash = crypto.createHash('md5').update(bname).digest('hex');
        this.Permission = 'FULL_CONTROL';
        this.builder = new xmljs.Builder({xmldec: {'version': this.xmlversion, 'encoding': this.xmlencoding}});

        this.Owner = {};
        this.Grantee = [];
        this.corsrule = [];
        this.Topic = [];
        this.Event = [];
        this.routeRules = [];
        this.redirRule = {};
        
        this.isReqpayEnable = false;
        this.isLogEnable = false;
        this.isWebEnable = false;
        this.isVersionMfadel = false;
        this.isVersionEnable = false;
        this.isLifecycleEnable = false;
        this.isPolicyEnable = false;
        this.isWebredirEnable = false;

        this.succobj = [];
        this.errobj = [];
        this.tagObject = [];
        this.webObject = {},
        this.policyObject = {},
        this.locObject = '';
    },
    _readBucketStorage: function() {
    },
    _writeBucketStorage: function() {
    },
    CreateBucket: function(id, name, retfunc) {
        if (id && name) {
            var bucketname = this.Bucket_name;
            var objectptr = this;
            var crdate = new Date();
            var bsktid = _.random(1000,10000000000); //Avi: Need to do benchmarking and if less than 100000, need to change to pre-existing queue
            db.hset(bucket_list_str, bucketname, bsktid+"#"+crdate.toJSON()+"#"+objectptr.FULL_CONTROL);
            db.hset("BL-"+id, bucketname, bsktid+"#"+crdate.toJSON()+"#"+objectptr.FULL_CONTROL);
            objectptr.locObject = configinfo.localzone;
            objectptr.Owner['ID'] = id;
            objectptr.Owner['DisplayName'] =  name;
            objectptr.Grantee.push({'Grantee': {'ID': id, 'DisplayName': name}, 'Permission': objectptr.FULL_CONTROL});

            var $this = this;
         
            asfsObj.Create_Bucket(this.Bucket_name, function(bfcreate,msg){
                if(bfcreate)
                {
                  db.multi();
                  db.hset("PR-"+$this.bnameHash, 'locObject', objectptr.locObject);
                  db.hset("PR-"+$this.bnameHash, 'Owner', JSON.stringify(objectptr.Owner));
                  db.hset("PR-"+$this.bnameHash, 'Grantee', JSON.stringify(objectptr.Grantee));
                  db.exec().then(function (reply) {
                    retfunc(false,'');
                  });

                }
                else
                {
                    retfunc(true, 'err');     
                }

            });
        }else{
            retfunc(true, 'Invalid Parameters');
        }

    },


    RemoveBucket: function(uid, retfunc) {
        var bucketptr = this;
        var c = 0;
        db.hgetall(file_list_str+this.bnameHash).then(function (value){
            if(value && _.size(value)>0 ){
                console.log("Bucket not empty");
                retfunc(true, 4094);
            }else{

                asfsObj.Delete_Bucket(bucketptr.Bucket_name, function(bfremove,msg){
                    if(bfremove)
                    {

                        db.hdel("BL-"+uid, bucketptr.Bucket_name);
                            db.hdel(bucket_list_str, bucketptr.Bucket_name);
                            db.del("PR-"+bucketptr.bnameHash).then(function (value)
                            {
                             retfunc(false, true);                 
                            },function(error){retfunc(true, 4094);});
                    }
                    else
                    {
                        retfunc(true, 4094);
                    }        
                });
            }
        });
    },
    IsBucketExist : function(retfunc){
        db.hexists(bucket_list_str, this.Bucket_name).then(function (values){
                if(parseInt(values) === 1){ retfunc(true); } else{ retfunc(false);}
            });
    },
// End Bucket functionality

    SetOwner: function(id, name, retfunc) {
        if (id && name) {
            this.Owner['ID'] = id;
            this.Owner['DisplayName'] = name;
            db.hset("PR-"+this.bnameHash, 'owner', JSON.stringify(this.Owner)).then(function (values){
             retfunc(true);
         },function(error){retfunc(true, 'Redis Error');});
        }
        else
        {
            //return false;
            retfunc(false);
        }
        
    },
    ClearAllPermissions: function( retfunc ){
        //delete this.Grantee;
        db.hdel("PR-"+this.bnameHash, 'Grantee').then(function (values){
            retfunc(false,"");
        },function(error){retfunc(true,"Unable to delete key!");});   
    },
    GrantPermissionbyID: function(id, name, permission, retfunc) {
        db.hget("PR-"+this.bnameHash, 'Grantee').then(function(GranteeStr){
            if(GranteeStr && id && name && permission)
            {
                var GranteeObj = JSON.parse(GranteeStr);
                GranteeObj.Grantee.push({'Grantee': {'ID': id, 'DisplayName': name}, 'Permission': permission, '$': {"xmlns:xsi": xmlns, 'xsi:type': xmlxsi}});    
            }
            else if(GranteeStr && id && name)
            {
                GranteeObj.Grantee.push({'Grantee': {'ID': id}, 'Permission': permission, '$': {"xmlns:xsi": xmlns, 'xsi:type': xmlxsi}}); 
            }
            db.hset("PR-"+this.bnameHash, 'Grantee', JSON.stringify(GranteeObj)).then(function (values){
                retfunc(false,'');
            },function(error){retfunc(true,"Redis Error");});   
        });
    },
    GrantPermissionByURI: function(uri, permission, retfunc) {
        db.hget("PR-"+this.bnameHash, 'Grantee').then(function(GranteeStr){
            if(GranteeStr && uri && permission)
            {
                var GranteeObj = JSON.parse(GranteeStr);
                GranteeObj.Grantee.push({'Grantee': {'URI': uri}, 'Permission': permission, '$': {"xmlns:xsi": xmlns, 'xsi:type': xmlxsi}});
                //retfunc(false,'');
            }
            db.hset("PR-"+this.bnameHash, 'Grantee', JSON.stringify(GranteeObj)).then(function (values){
                retfunc(false,'');
            },function(error){retfunc(true,"Redis Error");});       
        });    
    },
    GrantPermissionbyEmail: function(email, permission, retfunc) {
        db.hget("PR-"+this.bnameHash, 'Grantee').then(function(GranteeStr){
            if(GranteeStr && email && permission)
            {
                var GranteeObj = JSON.parse(GranteeStr);
                GranteeObj.Grantee.push({'Grantee': {'EmailAddress': email}, 'Permission': permission, '$': {"xmlns:xsi": xmlns, 'xsi:type': xmlxsi}});
                //return true;
            }
            db.hset("PR-"+this.bnameHash, 'Grantee', JSON.stringify(GranteeObj)).then(function (values){
                retfunc(false,'');
            },function(error){retfunc(true,"Redis Error");});    
        });    
        
    },
//Avinash: Need to discuss about callback, as well as this function is not being used right now
    SetCorsConfig: function(origin, method, header, maxage, expheader, retfunc) {
        db.hgetall("PR-"+this.bnameHash,'Grantee').then(function (value){
            var listobj = {};
            if(value){    
                if (value.origin)
                    listobj["AllowedOrigin"] = value.origin;
                if (value.method && _.isArray(value.method))
                    listobj["AllowedMethod"] = value.method;
                if (value.header)
                    listobj["AllowedHeader"] = value.header;
                if (value.maxage)
                    listobj["MaxAgeSeconds"] = value.maxage;
                if (value.expheader)
                    listobj["ExposeHeader"] = value.expheader;

                this.corsrule.push(listobj);
            }
        });
    },
   
    SetReqPayerConfig: function(payee, retfunc) {
        db.hget("PR-"+this.bnameHash, 'payee').then(function(payee){
            this.isReqpayEnable = true;
            this.Payer = payee;
            console.log("Payer", this.Payer);
            this.reqPayer = {'Payer': this.Payer};
            db.hset("PR-"+this.bnameHash, 'isReqpayEnable', true).then(function (values){
                if(parseInt(values) === 1){ //retfunc(true); 
                    db.hset("PR-"+this.bnameHash, 'reqPayer', JSON.stringify(this.reqPayer)).then(function (reqPayervalues){
                       retfunc(fase,'');
                   },function(error){retfunc(true,"Redis Error");});
                } else{ retfunc(true, "Redis Error");}
            });        
            

        });
    },

    SetNotificationConfig: function(topic, event, retfunc) {
        this.notifyObject['Topic'] = topic;
        this.notifyObject['Event'] = event;
        db.hset("PR-"+this.bnameHash, 'notifyObject', JSON.stringify(this.notifyObject)).then(function (values){
            retfunc(false,'');
        },function(error){
            retfunc(true,"Redis Error");
        });     
    },
    GetACLConfig: function(retfunc) {
        var $this = this;
        db.hgetall("PR-"+this.bnameHash).then(function (values){
            if(values)
             {
                $this.aclObject['Owner'] = JSON.parse(values.Owner);
                $this.aclObject['$'] = {"xmlns:xsi": xmlns, 'xsi:type': xmlxsi};
                $this.aclObject['AccessControlList'] = {'Grant': JSON.parse(values.Grantee)};
                retfunc($this.builder.buildObject({"AccessControlPolicy": $this.aclObject}));
            } 
            else {
                retfunc($this.builder.buildObject({"AccessControlPolicy": ''}));
            }
        });
    },
    GetCorsConfig: function(retfunc) {
        var $this = this;
        db.hget("PR-"+this.bnameHash, 'corsrule').then(function(corsruleStr){ 
            if(corsruleStr)
            {
                var corsruleObj = JSON.parse(corsruleStr);
                retfunc($this.builder.buildObject({"CORSConfiguration": {'CORSRule': corsruleObj}}));
            }
        });
    },    
    GetReqPayerConfig: function(retfunc) {
        //this._readBucketStorage();
        var $this = this;
        db.hget("PR-"+this.bnameHash, 'reqPayer').then(function(reqPayerStr){ 
            if(reqPayerStr)
            {
                var reqPayerObj = JSON.parse(reqPayerStr);
                reqPayerObj["$"] = {"xmlns": xmlns};
                retfunc(this.builder.buildObject({"RequestPaymentConfiguration": reqPayerObj}));
            }
        });
        
    }, 
    GetNotificationConfig: function(retfunc) {
        $this = this;
        db.hget("PR-"+this.bnameHash, 'notifyObject').then(function(notifyObjectStr){ 
            if(notifyObjectStr)
            {
                var notifyObject = JSON.parse(notifyObjectStr);
                retfunc($this.builder.buildObject({"NotificationConfiguration": {"TopicConfiguration": notifyObject}}));
            }else {
                retfunc(false);
            }
        });
    },
    
    SetLifecycleConfig_Day: function(id, prefix, status, trans_day, trans_sclass, expdate, retfunc) {
        var $this = this;

        if (id && prefix && status) {
            this.lifecycleObject['ID'] = id;
            this.lifecycleObject['Prefix'] = prefix;
            if (status)
                this.lifecycleObject['Status'] = 'Enabled';
            else
                this.lifecycleObject['Status'] = 'Disabled';
        }
        if(trans_day)
            this.lifecycleObject['Transition']["Days"]= trans_day;
        if(trans_sclass)
            this.lifecycleObject['Transition']["StorageClass"] = trans_sclass;
        
        if (expdate) {
            this.lifecycleObject['Expiration'] = {'Date': expdate};
        }

        db.multi();
        db.hset("PR-"+this.bnameHash, 'lifecycleObject', JSON.stringify(this.lifecycleObject));     
        db.hset("PR-"+this.bnameHash, 'isLifecycleEnable', true);     
        db.exec().then(function (reply) {
            retfunc(false,'');
        });

    },
    SetLifecycleConfig_Date: function(id, prefix, status, trans_date, trans_sclass, expdate, retfunc) {
        var $this = this;
        if (id && prefix && status) {
            this.lifecycleObject['ID'] = id;
            this.lifecycleObject['Prefix'] = prefix;
            if (status)
                this.lifecycleObject['Status'] = 'Enabled';
            else
                this.lifecycleObject['Status'] = 'Disabled';
        }
        if(trans_date)
            this.lifecycleObject['Transition']["Date"]= trans_date;
        if(trans_sclass)
            this.lifecycleObject['Transition']["StorageClass"] = trans_sclass;
        if (expdate)
            this.lifecycleObject['Expiration'] = {'Date': expdate};
        db.multi();
        db.hset("PR-"+this.bnameHash, 'lifecycleObject', JSON.stringify(this.lifecycleObject));     
        db.hset("PR-"+this.bnameHash, 'isLifecycleEnable', true);     
        db.exec().then(function (reply) {
            retfunc(false,'');
        });
    },
    GetLifecycleConfig: function(retfunc) {
        var $this = this;
        db.hgetall("PR-"+this.bnameHash).then(function(values){ 
            //console.log(lifecycleObjectStr);
            if(values.lifecycleObject)
            {
                var lifecycleObject = JSON.parse(values.lifecycleObject);


                if (values.isLifecycleEnable)
                    retfunc($this.builder.buildObject({"LifecycleConfiguration": {"$": {"xmlns": xmlns}, 'Rule': lifecycleObject}}));
                else
                    retfunc(false);
            }
        });  
    },
// LIFECYCLE functionality Ends

// This is working functionality but need to connect with location list. NEED to finish that
// LOCATION functionality Start

//Avinash: I did not get any setlocation function in activeufs.js
    SetLocation: function(location, retfunc)
    {
        if (location)
            this.locObject = location;
            //this._writeBucketStorage(funptr);
            db.hset("PR-"+this.bnameHash, locObject, configinfo.localzone).then(function (values){
                retfunc(false,'');
            },function(error){retfunc(true,"Redis Error");});     
        },
        GetLocation: function(retfunc) {
        var $this = this;
        db.hget("PR-"+this.bnameHash, 'locObject').then(function(locObjectStr){
            if(locObjectStr)
                retfunc($this.builder.buildObject({"LocationConstraint": JSON.parse(locObjectStr)}));
            else
                retfunc(false);
        });
    },
// LOCATION functionality Ends

// This is working functionality but policy are not enforced yet. NEED to finish that
// POLICY functionality Start
//Avinash: This function is not being used in Activeufs
    SetPolicy: function(ver, id, retfunc) {
        this.isPolicyEnable = true;
        this.policyObject["Version"] = ver;
        this.policyObject["Id"] = id;
        db.multi();
        db.hset("PR-"+this.bnameHash, 'policyObject', JSON.stringify(this.policyObject));
        db.hset("PR-"+this.bnameHash, 'isPolicyEnable', JSON.stringify(this.isPolicyEnable));     
        db.exec().then(function (reply) {
            retfunc(false,'');
        });

    },
    // Need to use that in code
    SetPolicyStatement: function(effect, sid, action, res, principal, retfunc) {
       if (effect)
           this.Statement["Effect"] = effect;
       if (sid)
           this.Statement["Sid"] = sid;
       if (action)
           this.Statement["Action"] = action;
       if (res)
           this.Statement["Resource"] = res;
       if (_.isArray(principal))
           this.Statement["Principal"] = {"AWS": principal};
       this.policyObject["Statement"] = [this.Statement];
       db.hset("PR-"+this.bnameHash, 'policyObject', JSON.stringify(this.policyObject)).then(function (values){
           retfunc(false,'');
       },function(error){retfunc(true,"Redis Error");});
    },
    GetPolicy: function(retfunc) {
        db.hgetall("PR-"+this.bnameHash).then(function(values){
            if(values)
            {
                var policyObject = JSON.parse(values.policyObject);
                if(values.isPolicyEnable)
                {
                    retfunc(policyObject);
                }
                else
                {
                    retfunc(false);
                }
            }
        });
    },
    //Avinash: This function is not added in activeufs
    DeletePolicy: function(retfunc) {
        // here we delete the object and find
        var $this = this;
        db.hget("PR-"+this.bnameHash, 'policyObject').then(function(policyObjectStr) 
        {
            if(policyObjectStr)
            {
                hdel("PR-"+$this.bnameHash, 'policyObject').then(function (values){
                    retfunc(false, '');
                },function(error){retfunc(true,"Redis Error");});     
            }   
            
            else
                retfunc(true);
        });
    },

    SetVersioning: function(enable,retfunc) {
        //this._readBucketStorage();
        //Avinash: No need to read version from redis until we are inheriting the properties
        if (enable === true) {
            this.isVersionEnable = true;
            this.versionObject = {'isenable': this.isVersionEnable};
        }
        else {
            this.isVersionEnable = false;
            this.versionObject = {'isenable': this.isVersionEnable};
            
        }
        db.multi();
        db.hset("PR-"+this.bnameHash, 'versionObject', JSON.stringify(this.versionObject));
        db.hset("PR-"+this.bnameHash, 'isVersionEnable', this.isVersionEnable);

        db.exec().then(function (reply) {
            retfunc(false,'');
        });
    },

    VersionEnable: function(retfunc) {
        var $this = this;
        //console.log("PR-"+this.bnameHash);
        db.hget("PR-"+this.bnameHash, "isVersionEnable").then(function(value){ 
            //console.log("value in bucket.js"+value);
            if(value ){
                retfunc(true);                
            }
            else
            {
                retfunc(false);
            }
        });
    },

    SetVersionMfadel: function(srno, token, retfunc) {
        this.isVersionEnable = true;
        this.isVersionMfadel = true;
        this.versionObject = {'venable': this.isVersionEnable, 'vmfadel': this.isVersionMfadel, 'SerialNumber': srno, 'TokenCode': token};
        db.hset("PR-"+this.bnameHash, 'versionObject',  JSON.stringify(this.versionObject)).then(function (values){
            retfunc(false,'');
        },function(error){retfunc(true,"Redis Error");});
    },
    GetVersioning: function(retfunc) {
        var $this = this;
        db.hgetall("PR-"+this.bnameHash).then(function(value){ 
            var versionObject = JSON.parse(value.versionObject);
            versionObject["$"] = {"xmlns": xmlns};
            if(value.isVersionEnable){
                if (versionObject['isenable'])
                    versionObject['Status'] = 'Enable';
                else
                    versionObject['Status'] = 'Suspended';
            }
            retfunc($this.builder.buildObject({"VersioningConfiguration": versionObject}));
        });
    },

// VERSION functionality Ends

// This is working functionality but logs are not captures yet. NEED to finish that
// LOGGING functionality Start
    SetLogConfig: function(targetb, prefix, retfunc) {
        //Avinash: No need to read here if data is not inherited
        if (targetb) {
            // Need to setup following
            //'EmailAddress': '', 'Grant': '', 'Grantee': '', 'LoggingEnabled': '', 'Permission': 'FULL_CONTROL', 'TargetBucket': '', 'TargetGrants': '', 'TargetPrefix': ''
            this.isLogEnable = true;
            this.logObject["TargetBucket"] = targetb;
            this.logObject["TargetPrefix"] = prefix;
            db.hset("PR-"+this.bnameHash,"logObject", JSON.stringify(this.logObject)).then(function (values){
                //console.log(values+"this is a test value",error);
                retfunc(false,'');
            },function(error){retfunc(true, 'Redis Error');});     
        }
        else
            retfunc(true, 'Redis Error');
    },

    GetLogConfig: function(retfunc) {
        var $this = this;
        db.hgetall("PR-"+this.bnameHash).then(function(value){ 
            var logObject = JSON.parse(value.logObject);
            logObject["$"] = {"xmlns": xmlns};
            if(value.isLogEnable){
                logObject['TargetGrants'] = {'Grant': value.Grantee};
            }
            retfunc($this.builder.buildObject({"BucketLoggingStatus": logObject}));    
        });
    },
    // THIS NEED fix in .5
    DeleteLogging: function(retfunc) {
        db.hget("PR-"+this.bnameHash,'logObject').then(function(logObjectStr){ 
            if (logObjectStr) {
            //delete this.logObject;
            hdel("PR-"+this.bnameHash,'logObject').then(function (values){
                retfunc(false);
            },function(error){retfunc(true,"Redis Error");});     
            //this._writeBucketStorage(funptr);
            }else
                retfunc(true);    
        });
    },    
// LOGGING functionality Ends

// This is working functionality. Nothing to be changed here
// WEBSITE Config functionality Start
    SetWebConfig: function(indexd, errord, retfunc) {
        var $this = this;
        db.hgetall("PR-"+this.bnameHash).then(function(values){     
          if(values)
          {  
            if(values.routeRules)
                values.routeRules = [];
            if(values.redirRule)
                values.redirRule = {};
            var webrule = null;
            if (indexd) {
                values.webObject['IndexDocument'] = {'Suffix': indexd};
                webrule = htaccess_index + indexd + '\r\n';
                values.isWebEnable = true;
            }
            if (errord) {
                values.webObject['ErrorDocument'] = {'Key': errord};
                for (var itext in htaccess_errors) {
                    webrule += htaccess_errors[itext] + errord + '\r\n';
                }
                values.isWebEnable = true;
            }
            db.multi();
            db.hset("PR-"+$this.bnameHash, 'routeRules', JSON.stringify(values.routeRules));
            db.hset("PR-"+$this.bnameHash, 'redirRule', JSON.stringify(values.redirRule));
            db.hset("PR-"+$this.bnameHash, 'webrule', webrule);
            db.hset("PR-"+$this.bnameHash, 'webObject', JSON.stringify(values.webObject));
            db.hset("PR-"+$this.bnameHash, 'isWebEnable', values.isWebEnable);
            db.exec().then(function (reply) {
                    retfunc(false,'');
                });
            }
        });
    },
    SetWebRedirect: function(hostname, funptr) {
        db.hgetall("PR-"+this.bnameHash).then(function(values){
            if(values.webObject){
                values.webObject = {};
            }
            if(values.routeRules){
                values.routeRules = [];
            }
            if(values.redirRule['HostName'])
                values.redirRule = {};
            var webrule = '';
            if (hostname) {
                hostname = hostname.toLowerCase();
                if(hostname.indexOf("http://") < 0)
                    hostname = "http://" + hostname;
                values.redirRule['HostName'] = hostname;
                webrule = htaccess_redir + ' 301 ' + hostname;
                values.isWebredirEnable = true;

                var $this = this;
                db.multi(); //webObject, routeRules, redirRule,isWebredirEnable
                db.hset("PR-"+$this.bnameHash, bhtaccess, webrule);                        
                db.hset("PR-"+$this.bnameHash, 'webObject', JSON.stringify(values.webObject));
                db.hset("PR-"+$this.bnameHash, 'routeRules', JSON.stringify(values.routeRules));
                db.hset("PR-"+$this.bnameHash, 'redirRule', JSON.stringify(values.redirRule));
                db.hset("PR-"+$this.bnameHash, 'isWebredirEnable', values.isWebredirEnable);
                db.exec().then(function (reply) {
                    retfunc(false,'');
                });
            }
            else
                funptr(true,'Redis Error');
        });
    },
    SetWebRouteForPrefix: function(condition, prefix, retfunc) {
        db.hgetall("PR-"+this.bnameHash).then(function(values){
            if(values.redirRule['HostName'])
                values.redirRule = {};
            if (condition && prefix)
            {
                // I guess we need to do some redirection here but i am not sure yet how it will work
                // webrule = htaccess_redir + condition + ' ' + prefix;
                values.routeRules.push({'Condition': {'KeyPrefixEquals': condition}, 'Redirect': {'ReplaceKeyPrefixWith': prefix}});
                values.isWebEnable = true;
                db.multi(); 
                db.hset("PR-"+this.bnameHash, 'routeRules', JSON.stringify(values.routeRules));
                db.hset("PR-"+this.bnameHash, 'isWebEnable', values.isWebEnable);
                db.hset("PR-"+this.bnameHash, 'redirRule', JSON.stringify(values.redirRule));
                db.exec().then(function (reply) {
                    retfunc(false, '');
                });

            }else
                retfunc(true, "Condition didn't match");
        });    
    },
    SetWebRouteForErrCode: function(condition, host, prefix, retfunc) {
        var $this = this;
        db.hgetall("PR-"+this.bnameHash).then(function(values){
            if(values.redirRule['HostName'])
                values.redirRule = {};        
            var rerr = {};
            if (condition && host && prefix){
                rerr['Condition'] = {'HttpErrorCodeReturnedEquals': condition};
                rerr['Redirect'] = {'HostName': host, 'ReplaceKeyPrefixWith': prefix};
                values.isWebEnable = true;
                values.routeRules.push(rerr);
                db.multi(); 
                db.hset("PR-"+this.bnameHash, 'routeRules', JSON.stringify(values.routeRules));
                db.hset("PR-"+this.bnameHash, 'isWebEnable', values.isWebEnable);
                db.hset("PR-"+this.bnameHash, 'redirRule', JSON.stringify(values.redirRule));
                db.exec().then(function (reply) {
                    retfunc(false, '');
                });
            }else
                retfunc(true, "Condition didn't match");
        });
    },
    GetWebConfig: function() {
        var $this = this; 
        db.hgetall("PR-"+this.bnameHash).then(function(values){
            var redirRule = JSON.parse(values.redirRule);
            var webObject = JSON.parse(values.webObject);
            var routeRules = JSON.parse(values.routeRules);
            if (redirRule['HostName']){
                webObject = {};
                webObject['RedirectAllRequestsTo'] = redirRule;
            }
            else if (routeRules.length > 0)
                webObject['RoutingRules'] = {"RoutingRule":routeRules};

            webObject["$"] = {"xmlns": xmlns};
            if (values.isWebEnable)
                return ($this.builder.buildObject({"WebsiteConfiguration": webObject}));
            else
                return $this.builder.buildObject({"WebsiteConfiguration": ''});
        });
    },
    DeleteWebsite: function(funptr) {
            // here we delete the object and find
            //this._readBucketStorage();
        db.hgetall("PR-"+this.bnameHash).then(function(values){  
                if (values.webObject) {
                    values.isWebEnable = false;
                    values.webObject = {};
                }
                if (values.routeRules.length) {
                    values.isWebEnable = false;
                    values.routeRules = [];
                }
                if(values.redirRule)
                    values.redirRule = {};
                var $this = this;
                db.multi(); 
                db.hset("PR-"+$this.bnameHash, 'routeRules', JSON.stringify(values.routeRules));
                db.hset("PR-"+$this.bnameHash, 'isWebEnable', values.isWebEnable);
                db.hset("PR-"+$this.bnameHash, 'redirRule', JSON.stringify(values.redirRule));
                db.hset("PR-"+$this.bnameHash, 'webObject', JSON.stringify(values.webObject));
                db.hdel("PR-"+$this.bnameHash, 'webrule');
                db.exec().then(function (reply) {
                    retfunc(false, '');
                });

            });
    },
// WEBSITE functionality Ends

// This is working functionality. Nothing to be changed here
// TAG functionality Start
    SetTag: function(kvarray, retfunc) {
        var $this = this;
        db.hgetall("PR-"+this.bnameHash).then(function(values){  
            values.tagObject = [];
            for( ti in kvarray) {
                values.isTagEnable = true;
                values.tagObject.push({'Key': ti, 'Value': kvarray[ti]});
            }
            db.multi();
            db.hset("PR-"+$this.bnameHash, 'isTagEnable', JSON.stringify(values.isTagEnable));
            db.hset("PR-"+$this.bnameHash, 'tagObject', JSON.stringify(values.tagObject));
            db.exec().then(function (reply) {
                retfunc(false, '');
            });

        });
    },
    GetTag: function(retfunc) {
        var $this = this;
        db.hget("PR-"+$this.bnameHash, 'tagObject').then(function(value){  
            if(value){ 
                retfunc($this.builder.buildObject({"Tagging": {'TagSet': {'Tag': JSON.parse(value)}}}));
            }
              else retfunc(false);

        });
    },
    DeleteTag: function(retfunc) {
        db.hset("PR-"+this.bnameHash, 'isTagEnable', "false").then(function(value){  
            retfunc(false);
        },function(error){retfunc(true,"Redis Error"); console.log("In Error")});
        db.hdel("PR-"+this.bnameHash, 'tagObject');
       }
});


var BUCKET_LIST = defineClass({
    Owner: {},
    constructor: function() {
        this.Owner = {};
        this.Buckets = [];
    },
    SetOwner: function(id, name) {
        this.Owner = {'ID': id, 'DisplayName': name};
    },
    GetList: function(uid, retfunc) {
        var bptr = this;
        var bucketlist = [];
        var builder = new xmljs.Builder({xmldec: {'version': '1.0', 'encoding': 'UTF-8'}});
        db.hgetall("BL-"+uid).then( function (blist){
            if(blist){
                for(var vkey in blist){
                    var binfo = blist[vkey].split("#");
                    if(binfo[1])
                        bucketlist.push({'Name': vkey, 'CreationDate': binfo[1]});
                }
                retfunc(false, builder.buildObject({"ListAllMyBucketsResult": {"$": {"xmlns": xmlns}, 'Owner': bptr.Owner, 'Buckets': {'Bucket': bucketlist}}}));
            }
        });
    }
});

module.exports.BUCKET_LIST = BUCKET_LIST;
module.exports.BUCKET_Property = BUCKET_Property;
