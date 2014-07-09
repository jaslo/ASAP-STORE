var xmljs = require('xml2js');
var defineClass = require("./defineClass.js").defineClass;
var fs = require('fs');
var fsext = require('fs-extra');
var _ = require('underscore');
var crypto = require('crypto');
var theredis = require('then-redis');
var configinfo = require('./config.js');

var xmlns = 'http://s3.amazonaws.com/doc/2006-03-01/';
var xmlxsi = 'http://www.w3.org/2001/XMLSchema-instance';


var lineage = require('lineage')
, protocol = lineage.protocol
, Clock = require('lineage/lib/types/clock');

var asfsClass = require("./asfs.js");

var asfsObj = new asfsClass.ASFS_Class();

var db = theredis.createClient({
  host: configinfo.redis.host,
  port: configinfo.redis.port
});

var file_list_str = "flist-";

var OBJECT_Class = defineClass({
    builder     : '',
    xmlversion  : '1.0',
    xmlencoding : 'UTF-8',
    
    bname       : '',
    kname       : '',
    oname       : '',
    size        : 0,
    createDate  : '',
    Owner       : {},
    Grantee     : [],
    aclObject   : {},
    md5Object   : '',
    DeleteResult:[],
    DeleteFail  :[],
    
    constructor: function (bname, kname){
        this.bname = '';
        this.kname = '';
        this.oname = '';
        this.md5Object = '';
        this.size = 0;
        this.DeleteResult = [];
        this.DeleteFail = [];
        this.builder = new xmljs.Builder({xmldec: {'version': this.xmlversion, 'encoding': this.xmlencoding}});
        if(bname)
        {
            this.bname = bname;
            this.bnameHash = crypto.createHash('MD5').update(bname).digest('hex');
        }
        if(kname){
            this.oname = decodeURI(kname);
            this.kname = crypto.createHash('MD5').update(kname).digest('hex');
        }
    },
    _GetProperty: function(){

    },
    _SetProperty: function(){

    },            
    SetParentBucket : function (bname){
        if(bname){
            this.bname = bname;
            this.bnameHash = crypto.createHash('sha1').update(bname).digest('hex');
        }
    },
    SetKeyName : function (kname){
        if(kname){
            this.oname = decodeURI(kname);
            this.kname = crypto.createHash('MD5').update(kname).digest('hex');
        }
    },
    SetOwner: function(id, name) {
        this._readBucketStorage();
        if (id && name) {
            this.Owner['ID'] = id;
            this.Owner['DisplayName'] = name;
        }
        return false;
    },
    GrantPermissionbyID: function(id, name, permission) {
        this._readBucketStorage();
        if (name === undefined) {
            this.Grantee.push({'Grantee': {'ID': id}, 'Permission': permission, '$': {"xmlns:xsi": xmlns, 'xsi:type': xmlxsi}});
        } else {
            this.Grantee.push({'Grantee': {'ID': id, 'DisplayName': name}, 'Permission': permission, '$': {"xmlns:xsi": xmlns, 'xsi:type': xmlxsi}});
        }
    },
    GrantPermissionByURI: function(uri, permission) {
        if (uri && permission){
            this.Grantee.push({'Grantee': {'URI': uri}, 'Permission': permission, '$': {"xmlns:xsi": xmlns, 'xsi:type': xmlxsi}});
            return true;
        }
        return false;
    },

    GrantPermissionbyEmail: function(email, permission) {
        if (email && permission){
            this.Grantee.push({'Grantee': {'EmailAddress': email}, 'Permission': permission, '$': {"xmlns:xsi": xmlns, 'xsi:type': xmlxsi}});
            return true;
        }
        return false;
    },
    
    setObjAcl: function(aclObj, retfunc)
    {
        objptr = this;
        db.hget(file_list_str+this.bnameHash, this.kname).then(function(value){
            if(value) {
                db.hset(file_list_str+objptr.bnameHash, objptr.kname,value+'#'+JSON.stringify(aclObj)).then(function(){
                    retfunc(false);
                });
             } else {
                retfunc(true,'key does not exists');
             }
         });
    },
    getObjAcl: function(retfunc)
    {
        var bptr = this;
        db.hget(file_list_str+this.bnameHash, this.kname).then(function(value){
            if(value) {
                if(value.indexOf('permission')>0) {
                    var array = value.split('#');
                    var index = array.length-1;
                    var aclObj = JSON.parse(array[index]);
                    var grantObj = {};
                    grantObj.Grant = {};
                    var responseObj = {};
                    
                    for(var key in aclObj)
                    {
                        grantObj = {"Grantee":{"ID":"need to check","DisplayName":"need to check"},"Permission":aclObj[key].permission};
                    }
                    retfunc(false, bptr.builder.buildObject({"AccessControlPolicy": {"$": {"xmlns": xmlns}, "Owner":{"ID":"1234567","DisplayName":"demo1@activescaler.com"},"AccessControlList":{"Grant":grantObj}}}));
                } else {
                    retfunc(true,'Permission invalid state'); //give the value of acl from default state
                }
             } else {
                retfunc(true,'key does not exist');
             }
         });    
    },
    GetMultiDeleteResult: function(){
        var mdresult = [];
        if(_.size(this.DeleteResult))
            mdresult["Deleted"] = this.DeleteResult;
        if(_.size(this.DeleteFail))
            mdresult['Error'] = this.DeleteFail;
        return(this.builder.buildObject({"DeleteResult":mdresult}));
    },
    GetObject: function(versionid, retfunc){
        var filepath = '';
        var qkey = '';
        if(versionid){
            filepath = this.bname + '/' +versionid+'_'+this.kname;
            qkey = this.kname+'_' + versionid;
        }else{
            filepath = this.bname + '/' + this.kname;
            qkey = this.kname;
        }
        var $this = this;
        db.hget(file_list_str+this.bnameHash, qkey).then(function(value){
            asfsObj.Is_Path_Exists($this.bname, $this.kname, filepath, function(exists){
                if(exists) {
                    asfsObj.Object_Read($this.bname, $this.kname, filepath, function(err,rdata){
                        if(!err)
                            retfunc(false, value, rdata);
                        else
                            retfunc(true);
                    });    
                } else {
                    retfunc(true);
                }
                
            });
        });            
    },
    IsObjectExist: function(versionid, retfunc){
        var filepath = '';
        var qkey = '';
        if(versionid){
            filepath = configinfo.fsDir + this.bname + '/' +versionid+'_'+this.kname;
            qkey = this.kname+'_' + versionid;
        } else{
            filepath = configinfo.fsDir + this.bname + '/' + this.kname;
            qkey = this.kname;
        }
        var $this = this;
        asfsObj.Is_Path_Exists($this.bname, $this.kname, filepath, function(isExists){
            if(isExists)
            {
                db.hget(file_list_str+$this.bnameHash, qkey).then(function(value){
                    retfunc(false, value);
                });   
            }
        });    
    },
    GetObjectAcl: function(){
        // NEED TO FIX .5
    },
    HeadObject: function (){

    },
    OptionsObject:function (){

    },
    getLatestVersion: function(func) {
        var largest = 0;
        db.hgetall(this.bnameHash+'-'+this.kname+'-V').then(function(values){

            if(values)
            {
                for(key in values)
                {
                    if(parseInt(key)>=largest)
                    {
                        largest = parseInt(key);
                    }
                }
            }
            var clock = new Clock();
            var clockVal = protocol.incr(clock, this.kname);
            var newVersion = clockVal+largest;

            func(newVersion);
        });
    },

    saveObject: function(data, bversion, objptr, returnfn){
        var filepath = '';
        var result = [];
        var objptr = this;
        filepath = this.bname + '/' + this.kname;
        var bucketName = this.bname; 
        db.hget(file_list_str+objptr.bnameHash, objptr.kname).then(function(value){
           if(!value || (value && bversion)) {
                   asfsObj.Object_Write(objptr.bname,objptr.kname, filepath, data, function(err){     
                    if(!err){
                        result['SIZE'] = data.length;
                        result['ETAG'] = crypto.createHash('md5').update(data).digest('hex');
                        result['CDATE'] = new Date().toJSON();
                        db.hset(file_list_str+objptr.bnameHash, objptr.kname, objptr.oname+"#"+result['SIZE']+"#"+result['ETAG']+"#"+result['CDATE']);
                        returnfn(false,result);
                        delete result;
                    }
                    else{
                        result['MESSAGE'] = "Write File failed.";
                        returnfn(true, result);
                    }
                });
           }
           else
           {
                result['MESSAGE'] = "Key already exist";
                returnfn(true, result);
                return false;
           }
        });
    },

    PutObject: function(data, bversion, returnfn){
        var filepath = '';
        var result = [];
        var objptr = this;
        var filepath = this.bname + '/' + this.kname;
        if(bversion)
        {
            objptr.getLatestVersion(function(newVersion){
                if(newVersion)
                {
                    db.hget(file_list_str+objptr.bnameHash, objptr.kname).then(function(value){
                     if(value)
                     {
                        db.hset(objptr.bnameHash+'-'+objptr.kname+'-V', newVersion, value);
                        var newFilePath = objptr.bname + '/' + objptr.kname+'_'+newVersion;
                        asfsObj.Object_Rename(objptr.bname,objptr.kname,filepath, newFilePath, function(error){
                            if(!error)
                            {
                               objptr.saveObject(data, bversion, objptr, returnfn); 
                            }
                            else
                            {
                                result['MESSAGE'] = "File Permission Error";
                                returnfn(true, result);
                            }
                        });
                      }
                      else
                      {
                        result['MESSAGE'] = "Redis entry of the old file is missing";
                        returnfn(true, result);
                      } 

                    });
                }
                else
                {
                    objptr.saveObject(data, bversion, objptr, returnfn);
                }
            });                                   
        }
        else
        {
            objptr.saveObject(data, bversion, objptr, returnfn);
        }
    },

    PutObjectAcl: function() {

    },
    PutObjectCopy: function() {

    },
    InitiateMultiPartUpload: function(data){
        var mpartupload= {};
        mpartupload['Bucket'] = this.bname;
        mpartupload['Key'] = this.kname;
        mpartupload['UploadId'] = crypto.createHash('sha256').update(_.random(10000,10000000000)+this.kname).digest('hex');
        mpartupload["$"] = {"xmlns:xsi": xmlns};
        return($this.builder.buildObject({"InitiateMultipartUploadResult":mpartupload}));
//        var $this = this;

    },
    UploadPart: function(uploadid, pid, data, returnfn){
        var etag = crypto.createHash('md5').update(data).digest('hex');
        var filepath = this.bname + "/"+uploadid+'/'+etag+"-"+pid;

        asfsObj.Object_UploadPart(bucketname, objectname, filepath, data, function (err){
                if(!err){
                    db.hset(uploadid, pid, etag);
                    returnfn(false, etag);
                }else{
                    returnfn(true, 'Write Failed');
                }
            });
    },
    UploadPartCopy: function(){
        //TODO:Need to work on this
    },
    CompleteMultiPartUpload: function(uploadid, uploadlist, returnfn){
        var $this = this;
        if(_.size(uploadlist)> 0){

            asfsObj.Object_CompleteMultiPartUpload(bucketname, objectName,uploadid, uploadlist, function(err, newFilePath){
                if(err){
                    returnfn(true, 'Uploaded XML is not correct');            
                }else{
                    db.del(uploadid);
                 returnfn(false, $this.builder.buildObject({"CompleteMultipartUploadResult": {"$": {"xmlns": xmlns}, 'Location': newFilePath, 'Bucket': $this.bname, 'key':$this.kname, 'ETag':crypto.createHash('md5').update($this.kname).digest('hex')}}));

                }
            });
        }
        else 
            returnfn(true, 'Uploaded XML is not correct');   
    },
    AbortMultiPartUpload: function(uploadid, returnfn){
        var path = configinfo.fsDir + this.bname + "/"+uploadid;
        fsext.remove(path, function(err){
            if(err)
                returnfn(false);
            else {
                 db.del(uploadid);
                 returnfn(true);
            }
        });
    },
    ListPart: function(uploadid, retfunc){
        var mpulist = [];
        var partObj = [];
        var i = 0;
        var bptr = this;
        var initiator = {"Initiator":{"ID":bptr.Owner, "Name":bptr.Owner}};
        var owner = {"Initiator":{"ID":bptr.Owner, "Name":bptr.Owner}};
        db.hgetall(uploadid).then( function (ulist){
            if(ulist){
             for(var vkey in ulist){
                    partObj.push({"partNumber":vkey,"LastModified":"Need to add", "Etag":ulist[vkey],"size":"Need to add"});
                   if(i++>=1000) 
                    break;
                }
                retfunc(false, bptr.builder.buildObject({"ListPartsResult": {"$": {"xmlns": xmlns}, 'Bucket':bptr.bname,'Key':bptr.kname, 'uploadId':uploadid, 'Initaitor':initiator, 'Part':partObj }}));
            }
            else
            {
                retfunc(true,'');   
            }
        });
    },
    DeleteObject: function(versionid, retfunc){
        var $this = this;
        var filepath = null;
        if(versionid)
            filepath = $this.bname + '/' +$this.kname+'_'+versionid;
        else
            filepath = $this.bname + '/' + $this.kname;
        asfsObj.Is_Path_Exists($this.bname, $this.kname, filepath, function(exists){
            if(exists)
            {
                asfsObj.Object_Delete($this.bname, $this.kname, filepath, function(err,msg){
                    if(err){
                      console.log("error in delete file", err);  
                      retfunc(true);  
                    } else {
                        $this.DeleteResult.push({'Key': $this.kname});
                        if(versionid) {
                            db.hdel($this.bnameHash+'-'+$this.kname+'-V');
                        } else {
                            db.hdel(file_list_str+$this.bnameHash, $this.kname);
                        }
                        retfunc(false);
                    }
                });    
            } else {
                $this.DeleteFail.push({'Key': $this.kname, 'Code': 'AccessDenied', 'Message': 'Access Denied'});
                retfunc(true);
            }
        });
    }
});
var OBJECT_LIST = defineClass({
    Search_criteria : [],
    Owner           : {},
    Buckets         : '',
    constructor: function() {
        this.Owner = {};
        this.Buckets = '';
            this.Search_criteria = {}; // 'Name', 'Prefix', 'Marker', 'MaxKeys', 'Delimiter', 'IsTruncated'
            this.Search_criteria['Prefix'] = null;
            this.Search_criteria['Marker'] = null;
            this.Search_criteria['MaxKeys'] = 1000;
            this.Search_criteria['Delimiter'] = null;
            this.Search_criteria['IsTruncated'] = false;
    },
    SetSearch_Prefix: function(prefix)
    {
        if (prefix) {
            this.Search_criteria['Prefix'] = prefix;
            this.Search_criteria['CommonPrefixes'] = prefix;
            return true;
        }
        return false;
    },
    SetSearch_Marker: function(marker) {
        if (marker){
            this.Search_criteria['Marker'] = marker;
            return true;
        }
        return false;
    },
    SetSearch_MaxKeys: function(maxkey) {
        if (maxkey > 0 && maxkey <= 1000){
            this.Search_criteria['MaxKeys'] = maxkey;
            return true;
        }
        return false;
    },
    SetSearch_Delimiter: function(delm) {
        if (delm){
            this.Search_criteria['Delimiter'] = delm;
            return true;
        }
        return false;
    },
    SetSearch_Truncate: function(itrnc) {
        this.Search_criteria['IsTruncated'] = 'false';
        if (itrnc){
            this.Search_criteria['IsTruncated'] = 'true';
        }
        return true;
    },
    GetSearchResults: function(bname, result) {
        // Just fake search Result till we implement this feature
        var Search_criteria = this.Search_criteria;
        var bnameHash = crypto.createHash('md5').update(bname).digest('hex');
        console.log(file_list_str+bnameHash);
        var optr = this;
            db.hgetall(file_list_str+bnameHash).then(function (flist) {
                console.log(flist);
                var itemcount = _.size(flist);
                if(itemcount){
                    var finalresult=null;
                    var Contents = [];
                    var count = 0;
                    for(var fkey in flist){
                        var binfo = flist[fkey].split("#");
                        Contents.push({'Key':  decodeURI(binfo[0]), 'LastModified': binfo[3], 'ETag': '"'+binfo[2]+'"', 'Size': binfo[1], 'StorageClass': 'STANDARD'});//, 'StorageClass': cclass, 'Owner': owner
                        delete binfo;
                        if(count >= 1000)
                            break;
                    }
                    Search_criteria["$"] = {"xmlns": xmlns};
                    Search_criteria['Contents'] = Contents;
                    var builder = new xmljs.Builder({xmldec: {'version': optr.xmlversion, 'encoding': optr.xmlencoding}});
                    finalresult = builder.buildObject({"ListBucketResult": Search_criteria});
                    result(false, finalresult);
                    delete finalresult;
                }else{
                    var builder = new xmljs.Builder({xmldec: {'version': optr.xmlversion, 'encoding': optr.xmlencoding}});
                    finalresult = builder.buildObject({"ListBucketResult": Search_criteria});
                    result(false, finalresult);
                }
            });               
    }
});

module.exports.OBJECT_Class = OBJECT_Class;
module.exports.OBJECT_LIST = OBJECT_LIST;

