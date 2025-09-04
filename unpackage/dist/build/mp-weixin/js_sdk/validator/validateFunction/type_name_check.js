"use strict";exports.type_name_check=function(e,t,n,p){console.log("vvvvv",n),0===n.type&&n.type_name.length>5&&p("姓名不能超过5位数"),1===n.type&&n.type_name.length<4&&p("企业名称不能低于4位数")};
