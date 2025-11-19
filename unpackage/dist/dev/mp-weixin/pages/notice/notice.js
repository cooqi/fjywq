"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      list: [],
      url: "",
      items: ["通知公告", "存续商务", "在/待播作品", "演出/活动"],
      current: 0,
      loading: false
    };
  },
  onShareAppMessage: function() {
    return {
      title: "宇青青宇全肯定",
      path: "/pages/rili/rili"
    };
  },
  onShareTimeline: function() {
    return {
      title: "宇青青宇全肯定"
    };
  },
  onLoad() {
    this.get();
  },
  onPullDownRefresh() {
    this.get();
  },
  methods: {
    onClickItem(e) {
      if (this.current !== e.currentIndex) {
        this.current = e.currentIndex;
        this.get();
      }
    },
    get() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      this.loading = true;
      common_vendor.tr.callFunction({
        name: "notice",
        data: {
          type: "get",
          classType: this.current.toString()
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.stopPullDownRefresh();
        this.list = res.result.data;
        this.loading = false;
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.stopPullDownRefresh();
        common_vendor.index.showModal({
          content: `查询失败，错误信息为：${err.message}`,
          showCancel: false
        });
        this.loading = false;
      });
    },
    lower() {
      alert(1);
    },
    addTask(item) {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      try {
        const user = common_vendor.index.getStorageSync("userInfo");
        common_vendor.index.__f__("log", "at pages/notice/notice.vue:101", "user", user);
        if (!user) {
          common_vendor.index.hideLoading();
          common_vendor.index.showModal({
            content: `还未登录请先去登录`,
            showCancel: false
          });
          return;
        }
        let userInfo = JSON.parse(user);
        common_vendor.tr.callFunction({
          name: "user-todo",
          data: {
            type: "add",
            userID: userInfo._id,
            title: item.title,
            taskID: item._id
          }
        }).then((res) => {
          common_vendor.index.__f__("log", "at pages/notice/notice.vue:120", "res", res);
          common_vendor.index.hideLoading();
          if (res.result.code) {
            common_vendor.index.showModal({
              content: `${res.result.message}`,
              showCancel: false
            });
          } else {
            common_vendor.index.showModal({
              content: `成功添加为我的任务，可以去我的todo里查看`,
              showCancel: false
            });
          }
        }).catch((err) => {
          common_vendor.index.hideLoading();
          common_vendor.index.showModal({
            content: `添加数据失败，错误信息为：${err.message}`,
            showCancel: false
          });
          common_vendor.index.__f__("error", "at pages/notice/notice.vue:140", err);
        });
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `还未登录请先去登录`,
          showCancel: false
        });
      }
    },
    actionsClick(url) {
      this.url = url;
    },
    preImg(imgs, i) {
      const urls = imgs.split(";") || [];
      common_vendor.index.previewImage({
        urls,
        current: i,
        longPressActions: {
          itemList: ["发送给朋友", "保存图片", "收藏"],
          success: function(data) {
            common_vendor.index.__f__("log", "at pages/notice/notice.vue:163", "选中了第" + (data.tapIndex + 1) + "个按钮,第" + (data.index + 1) + "张图片");
          },
          fail: function(err) {
            common_vendor.index.__f__("log", "at pages/notice/notice.vue:166", err.errMsg);
          }
        }
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_segmented_control2 = common_vendor.resolveComponent("uni-segmented-control");
  const _easycom_uni_link2 = common_vendor.resolveComponent("uni-link");
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  const _easycom_uni_card2 = common_vendor.resolveComponent("uni-card");
  (_easycom_uni_segmented_control2 + _easycom_uni_link2 + _easycom_uni_icons2 + _easycom_uni_card2)();
}
const _easycom_uni_segmented_control = () => "../../uni_modules/uni-segmented-control/components/uni-segmented-control/uni-segmented-control.js";
const _easycom_uni_link = () => "../../uni_modules/uni-link/components/uni-link/uni-link.js";
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
const _easycom_uni_card = () => "../../uni_modules/uni-card/components/uni-card/uni-card.js";
if (!Math) {
  (_easycom_uni_segmented_control + _easycom_uni_link + _easycom_uni_icons + _easycom_uni_card)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o($options.onClickItem),
    b: common_vendor.p({
      current: $data.current,
      values: $data.items
    }),
    c: common_vendor.f($data.list, (item, k0, i0) => {
      return common_vendor.e({
        a: item.content
      }, item.content ? {
        b: item.content
      } : {}, {
        c: item.imgs
      }, item.imgs ? {
        d: common_vendor.f(item.imgs.split(";"), (img, index, i1) => {
          return {
            a: common_vendor.o(($event) => $options.preImg(item.imgs, index)),
            b: img
          };
        })
      } : {}, {
        e: item.bz,
        f: "10caa2c9-2-" + i0 + "," + ("10caa2c9-1-" + i0),
        g: common_vendor.p({
          href: item.url,
          text: item.url
        }),
        h: item.type === "task"
      }, item.type === "task" ? {
        i: "10caa2c9-3-" + i0 + "," + ("10caa2c9-1-" + i0),
        j: common_vendor.p({
          type: "heart",
          size: "18",
          color: "#999"
        }),
        k: common_vendor.o(($event) => $options.addTask(item), item._id)
      } : {}, {
        l: common_vendor.n(item.is_today_important ? "today" : ""),
        m: item._id,
        n: "10caa2c9-1-" + i0,
        o: common_vendor.p({
          ["sub-title"]: item.top ? "置顶" : item.is_today_important ? "今日关注" : "",
          title: item.title,
          extra: item.type
        })
      });
    }),
    d: !$data.list.length && !$data.loading
  }, !$data.list.length && !$data.loading ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/notice/notice.js.map
