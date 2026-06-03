"use strict";
const ROLES = {
  SUPER_ADMIN: "s_admin",
  // 超级管理员
  ADMIN: "admin",
  // 管理员
  USER: "user"
  // 普通用户
};
function getUserRole(userInfo) {
  if (!userInfo)
    return ROLES.USER;
  return userInfo.role || ROLES.USER;
}
function isAdmin(userInfo) {
  const role = getUserRole(userInfo);
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}
function hasCalendarPermission(userInfo, action) {
  const role = getUserRole(userInfo);
  if (role === ROLES.SUPER_ADMIN) {
    return true;
  }
  if (role === ROLES.ADMIN) {
    return action === "add";
  }
  return false;
}
function hasSuggestionPermission(userInfo, action) {
  const role = getUserRole(userInfo);
  if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) {
    return true;
  }
  if (action === "view") {
    return true;
  }
  return false;
}
function hasConcertPermission(userInfo, action) {
  return isAdmin(userInfo);
}
exports.hasCalendarPermission = hasCalendarPermission;
exports.hasConcertPermission = hasConcertPermission;
exports.hasSuggestionPermission = hasSuggestionPermission;
//# sourceMappingURL=../../../.sourcemap/mp-weixin/common/js/permission.js.map
