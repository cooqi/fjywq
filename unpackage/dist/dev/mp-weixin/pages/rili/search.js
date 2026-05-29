"use strict";
const common_vendor = require("../../common/vendor.js");
const rili = require("../../rili.js");
const _sfc_main = {
  data() {
    return {
      searchParams: {
        keyword: "",
        date: ""
      },
      searchResults: [],
      loading: false,
      hasSearched: false
    };
  },
  methods: {
    handleDateChange(e) {
      if (e) {
        const dateObj = new Date(e.replace(/-/g, "/"));
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        this.searchParams.date = `${year}-${month}-${day}`;
      } else {
        this.searchParams.date = "";
      }
    },
    clearKeyword() {
      this.searchParams.keyword = "";
    },
    handleSearch() {
      const { keyword, date } = this.searchParams;
      if (!keyword && !date) {
        common_vendor.index.showToast({
          title: "请输入搜索条件",
          icon: "none"
        });
        return;
      }
      this.loading = true;
      this.hasSearched = true;
      this.searchResults = [];
      common_vendor._r.callFunction({
        name: "rili-get",
        data: {
          search: {
            keyword: keyword.trim(),
            date
          }
        }
      }).then((res) => {
        this.loading = false;
        const data = res.result.data || [];
        this.searchResults = rili.processJQLResults(data);
      }).catch((err) => {
        this.loading = false;
        common_vendor.index.showModal({
          content: `搜索失败：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/rili/search.vue:135", err);
      });
    },
    previewImage(imgs, i) {
      const urls = imgs.split(";") || [];
      common_vendor.index.previewImage({
        urls,
        current: i,
        longPressActions: {
          itemList: ["发送给朋友", "保存图片", "收藏"],
          success: function(data) {
            common_vendor.index.__f__("log", "at pages/rili/search.vue:146", "选中了第" + (data.tapIndex + 1) + "个按钮,第" + (data.index + 1) + "张图片");
          },
          fail: function(err) {
            common_vendor.index.__f__("log", "at pages/rili/search.vue:149", err.errMsg);
          }
        }
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  const _easycom_uni_datetime_picker2 = common_vendor.resolveComponent("uni-datetime-picker");
  (_easycom_uni_icons2 + _easycom_uni_datetime_picker2)();
}
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
const _easycom_uni_datetime_picker = () => "../../uni_modules/uni-datetime-picker/components/uni-datetime-picker/uni-datetime-picker.js";
if (!Math) {
  (_easycom_uni_icons + _easycom_uni_datetime_picker)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      type: "search",
      size: "18",
      color: "#999"
    }),
    b: common_vendor.o((...args) => $options.handleSearch && $options.handleSearch(...args), "ef"),
    c: $data.searchParams.keyword,
    d: common_vendor.o(($event) => $data.searchParams.keyword = $event.detail.value, "b8"),
    e: $data.searchParams.keyword
  }, $data.searchParams.keyword ? {
    f: common_vendor.p({
      type: "closeempty",
      size: "14",
      color: "#999"
    }),
    g: common_vendor.o((...args) => $options.clearKeyword && $options.clearKeyword(...args), "4d")
  } : {}, {
    h: common_vendor.o($options.handleDateChange, "b1"),
    i: common_vendor.o(($event) => $data.searchParams.date = $event, "de"),
    j: common_vendor.p({
      type: "date",
      placeholder: "选择日期",
      modelValue: $data.searchParams.date
    }),
    k: common_vendor.o((...args) => $options.handleSearch && $options.handleSearch(...args), "0d"),
    l: $data.loading
  }, $data.loading ? {} : $data.searchResults.length > 0 ? {
    n: common_vendor.t($data.searchResults.length),
    o: common_vendor.f($data.searchResults, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.date),
        b: item.distanceInfo && item.distanceInfo.displayText
      }, item.distanceInfo && item.distanceInfo.displayText ? {
        c: common_vendor.t(item.distanceInfo.displayText)
      } : {}, {
        d: common_vendor.t(item.title),
        e: item.bz
      }, item.bz ? {
        f: item.bz
      } : {}, {
        g: item.imgurl
      }, item.imgurl ? {
        h: common_vendor.f(item.imgurl.split(";"), (img, index, i1) => {
          return {
            a: index,
            b: img,
            c: common_vendor.o(($event) => $options.previewImage(item.imgurl, index), index)
          };
        })
      } : {}, {
        i: item._id
      });
    })
  } : $data.hasSearched ? {} : {}, {
    m: $data.searchResults.length > 0,
    p: $data.hasSearched
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/rili/search.js.map
