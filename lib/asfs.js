var configinfo = require('./config.js');
var fs = require('fs-extra');
var defineClass = require("./defineClass.js").defineClass;
var HashRing = require('hashring');
var _ = require('underscore');
var fsext = require('fs-extra');

var asfsring = new HashRing(configinfo.fsDirArray, 'md5');

var ASFS_Class = defineClass({
    
    Create_Bucket: function(bucketname, funcptr){
        var c = 0;
        for(fsDir in configinfo.fsDirArray)
        {
           fs.mkdir(configinfo.fsDirArray[fsDir] + bucketname, 0777, function(err){
                 if(err){ 
                   funcptr(false, err);
                 }
               c++;
               if(c==_.size(configinfo.fsDirArray))
               {
                  funcptr(true);  
               }
            }); 

        }
        
    },
    Delete_Bucket: function(bucketname, funcptr){
        var c = 0;
        for(fsDir in configinfo.fsDirArray)
        {
           fs.remove(configinfo.fsDirArray[fsDir] + bucketname, function(err){
                 if(err){ 
                   funcptr(false, err);
                 }
               c++;
               if(c==_.size(configinfo.fsDirArray))
               {
                  funcptr(true);  
               }
            }); 
        }
    },
    Is_Path_Exists: function(bucketname, objectName, filepath, funcptr){
         asfsring.range(objectName, configinfo.Replica).forEach(function forEach(fsDir) {
           fs.exists(fsDir + filepath, function(exists){
                 if(exists){ 
                   funcptr(true);
                 }
                 else
                 {
                    funcptr(false);
                 }
            });
           
        });
    },
      Object_InitiateMultipart: function(bucketname, objectname, multipartUploadId, funcptr){
       asfsring.range(objectName, configinfo.Replica).forEach(function forEach(fsDir) {
         fs.mkdirSync( fsDir + bucketname + '/'+ UploadId, 0777);
         funcptr(true);
      });
    },
    Object_Write: function(bucketname, objectName, filepath, data, funcptr){

       asfsring.range(objectName, configinfo.Replica).forEach(function forEach(fsDir) { 

        fs.writeFile(fsDir+ filepath, data, {'encoding':'utf8'}, function (err){

            if(!err)
                funcptr(false);
            else
                funcptr(true);
        });
      });      
    },
    Object_CompleteMultiPartUpload: function(bucketname, objectName,uploadid, uploadlist, funcptr){

      asfsring.range(objectName, configinfo.Replica).forEach(function forEach(fsDir) { 

             var path = fsDir+bucketname + "/"+uploadid+"/";
             var newFilePath = fsDir+bucketname + '/' + objectName;
             fs.readdir(path,function(err,files){
                if (err) returnfn(true, 'Unable to read directory');;
                var c=0;
//                var $fs = fs;
                files.forEach(function(file){
                    if(uploadlist[file] === 1) {
                        c++;
                        fs.readFile(path+file,'utf-8',function(err,fileData){
                            if (err) returnfn(true, 'Read failed');
                            fs.appendFile(newFilePath, fileData, function (err){
                              if (err) returnfn(true, 'Write Failed');;

                              if(0===--c)
                              {
                                fsext.removeSync(configinfo.fsDir + $this.bname + "/"+uploadid);
                                funcptr(false, newFilePath);
                            }
                            });
                        });
                    } else {
                        if (err) funcptr(true);
                    }
                }); 
            });      
      });      
    },
    Object_UploadPart: function(bucketname, objectname, filepath, data, funcptr){

       asfsring.range(objectName, configinfo.Replica).forEach(function forEach(fsDir) { 

        fs.outputFile(fsDir+filepath, data, function(err) {
          if(!err)
          {
            funcptr(false);
          }
          else
          {
            funcptr(true);
          }
        });

      });      
    },

    Object_Read: function(bucketname, objectName, filepath, funcptr){
    asfsring.range(objectName, configinfo.Replica).forEach(function forEach(fsDir) {
        fs.readFile(fsDir + filepath, function(err, rdata){
            if(!err)
                funcptr(false, rdata);
            else
                funcptr(true);
        });
      });  
    },
    Object_Rename: function(bucketname, objectName, filepath, newfilepath, funcptr){
      asfsring.range(objectName, configinfo.Replica).forEach(function forEach(fsDir) {
        fs.rename(fsDir + filepath, fsDir + newfilepath, function(error, success){
            if(!error)
                funcptr(false);
            else
                funcptr(true);
        });
      });  
    },
    Object_Delete: function(bucketname, objectName, filepath, funcptr){
         asfsring.range(objectName, configinfo.Replica).forEach(function forEach(fsDir) {
           fs.unlink(fsDir + filepath, function(err)
           {
                if(err)
                {
                    funcptr(true,err);
                }
                else
                {
                    funcptr(false);
                }
           });

        });
    }     
});
module.exports.ASFS_Class = ASFS_Class;