/* 
 * ActiveScaler Inc. All right reserved.
 *  Copyright 2009-2010 .
 */
var defineClass = require("./defineClass.js").defineClass;
var crypto = require('crypto');
var theredis = require('then-redis');
var db = theredis.createClient();

var ASAUTH_Class = defineClass({
    GetAuthorizeKey:function(pubkey, id, pkey){
        if(pubkey && id && pkey)
            return 'AWS '+pubkey+':'+crypto.createHmac("sha1",pkey).update('as'+id).digest("base64");
        else
            return false;
    },
    GetCanonicalizedAmzHeaders : function(headers){
	var canonicalizedHeaders = [];
	var as3Header=/x-amz-/i; 
        for (var header in headers){
            if(as3Header.test(header)){
                var value = headers[header];
                if(value instanceof Array){
                    value = value.join(',');
                }
                canonicalizedHeaders.push(header.toString().toLowerCase() + ':' + value);
            }
	}
	var res = canonicalizedHeaders.sort().join('\n'); 
	if(res){
		res += '\n';
	} 
	return res;
    },
    CreateAuthSignature: function (skey, opr, contentmd5, contenttype, date, cheader, cres ){
        var signatureBase = opr.toUpperCase()+'\n'+contentmd5+'\n'+contenttype+ '\n'+ date+'\n'+cheader+cres;
        return crypto.createHmac("sha1",skey).update(signatureBase).digest("base64");
    },
    AuthenticateRequest: function(pubkey, rmethod, rdate, hostname, cres, ctype, cmd5, insignature, retfunc){
        var aoptr = this;
        if(!pubkey){
            retfunc(true, 4032);
        }
        db.get("K-"+pubkey+"==").then(function (valueres){
            if(!valueres){
                retfunc(true, 4032);
            }
            else{
                var authlist = valueres.split(':');
                var signature = aoptr.CreateAuthSignature(authlist[1], rmethod, cmd5, ctype, rdate, hostname, cres);
                if((signature == insignature) && (parseInt(authlist[2]) === 1))
                {
                    retfunc(false, pubkey+':'+valueres);
                }
                else
                {
                    console.log("Signature Match fail");
                    retfunc(true, 4039);
                }
            }
        });
    }
});

module.exports.ASAUTH_Class = ASAUTH_Class;