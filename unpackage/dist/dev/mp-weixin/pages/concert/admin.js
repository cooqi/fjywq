"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      loading: false,
      searchKeyword: "",
      typeIndex: 0,
      typeList: [
        { label: "全部", value: "all" },
        { label: "演唱会", value: "演唱会" },
        { label: "音乐节", value: "音乐节" },
        { label: "其他", value: "其他" }
      ],
      provinceList: [
        "北京",
        "天津",
        "上海",
        "重庆",
        "河北",
        "山西",
        "辽宁",
        "吉林",
        "黑龙江",
        "江苏",
        "浙江",
        "安徽",
        "福建",
        "江西",
        "山东",
        "河南",
        "湖北",
        "湖南",
        "广东",
        "海南",
        "四川",
        "贵州",
        "云南",
        "陕西",
        "甘肃",
        "青海",
        "台湾",
        "内蒙古",
        "广西",
        "西藏",
        "宁夏",
        "新疆"
      ],
      provinceIndex: -1,
      concertList: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      hasMore: true,
      // 表单相关
      editMode: false,
      formTypeIndex: 1,
      formData: {
        _id: "",
        type: "演唱会",
        ychTheme: "",
        yhcTheme: "",
        Session: "",
        time: "",
        Province: "",
        address: "",
        playlist: "",
        bz: ""
      }
    };
  },
  onLoad() {
    this.loadData();
  },
  onPullDownRefresh() {
    this.page = 1;
    this.loadData(true);
  },
  methods: {
    // 加载数据
    loadData(isRefresh = false) {
      if (this.loading)
        return;
      this.loading = true;
      if (isRefresh) {
        common_vendor.index.showLoading({ title: "刷新中" });
      }
      const query = {};
      if (this.typeIndex > 0) {
        query.type = this.typeList[this.typeIndex].value;
      }
      if (this.searchKeyword) {
        query.keyword = this.searchKeyword;
      }
      common_vendor._r.callFunction({
        name: "concert-admin",
        data: {
          action: "getList",
          ...query,
          page: this.page,
          pageSize: this.pageSize
        },
        success: (res) => {
          this.loading = false;
          common_vendor.index.hideLoading();
          common_vendor.index.stopPullDownRefresh();
          if (res.result.code === 0) {
            if (isRefresh || this.page === 1) {
              this.concertList = res.result.data.list || [];
            } else {
              this.concertList = [...this.concertList, ...res.result.data.list || []];
            }
            this.totalCount = res.result.data.total || 0;
            this.hasMore = this.concertList.length < this.totalCount;
          } else {
            common_vendor.index.showToast({
              title: res.result.message || "加载失败",
              icon: "none"
            });
          }
        },
        fail: (err) => {
          this.loading = false;
          common_vendor.index.hideLoading();
          common_vendor.index.stopPullDownRefresh();
          common_vendor.index.__f__("error", "at pages/concert/admin.vue:259", "加载失败", err);
          common_vendor.index.showToast({
            title: "加载失败",
            icon: "none"
          });
        }
      });
    },
    // 加载更多
    loadMore() {
      this.page++;
      this.loadData();
    },
    // 类型筛选
    onTypeChange(e) {
      this.typeIndex = e.detail.value;
      this.page = 1;
      this.loadData(true);
    },
    // 省份选择变化
    onProvinceChange(e) {
      this.provinceIndex = e.detail.value;
      this.formData.Province = this.provinceList[this.provinceIndex] || "";
    },
    // 搜索
    handleSearch() {
      this.page = 1;
      this.loadData(true);
    },
    // 显示添加弹窗
    showAddDialog() {
      this.editMode = false;
      this.formData = {
        _id: "",
        type: "演唱会",
        ychTheme: "",
        yhcTheme: "",
        Session: "",
        time: "",
        Province: "",
        address: "",
        playlist: "",
        bz: ""
      };
      this.formTypeIndex = 1;
      this.provinceIndex = -1;
      this.$refs.popup.open();
    },
    // 编辑
    editConcert(item) {
      this.editMode = true;
      this.formData = {
        _id: item._id,
        type: item.type || "演唱会",
        ychTheme: item.ychTheme || "",
        yhcTheme: item.yhcTheme || "",
        Session: item.Session || "",
        time: item.time || "",
        Province: item.Province || "",
        address: item.address || "",
        playlist: item.playlist || "",
        bz: item.bz || ""
      };
      const index = this.typeList.findIndex((t) => t.value === this.formData.type);
      this.formTypeIndex = index > -1 ? index : 1;
      if (item.Province) {
        const provinceIndex = this.provinceList.indexOf(item.Province);
        this.provinceIndex = provinceIndex !== -1 ? provinceIndex : -1;
      } else {
        this.provinceIndex = -1;
      }
      this.$refs.popup.open();
    },
    // 删除
    deleteConcert(item) {
      common_vendor.index.showModal({
        title: "确认删除",
        content: `确定要删除"${item.ychTheme || item.type}"吗？`,
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "删除中" });
            common_vendor._r.callFunction({
              name: "concert-admin",
              data: {
                action: "delete",
                id: item._id
              },
              success: (res2) => {
                common_vendor.index.hideLoading();
                if (res2.result.code === 0) {
                  common_vendor.index.showToast({
                    title: "删除成功",
                    icon: "success"
                  });
                  this.page = 1;
                  this.loadData(true);
                } else {
                  common_vendor.index.showToast({
                    title: res2.result.message || "删除失败",
                    icon: "none"
                  });
                }
              },
              fail: (err) => {
                common_vendor.index.hideLoading();
                common_vendor.index.__f__("error", "at pages/concert/admin.vue:376", "删除失败", err);
                common_vendor.index.showToast({
                  title: "删除失败",
                  icon: "none"
                });
              }
            });
          }
        }
      });
    },
    // 表单类型变化
    onFormTypeChange(e) {
      this.formTypeIndex = e.detail.value;
      this.formData.type = this.typeList[this.formTypeIndex].value;
    },
    // 提交表单
    submitForm() {
      if (!this.formData.type) {
        common_vendor.index.showToast({
          title: "请选择类型",
          icon: "none"
        });
        return;
      }
      common_vendor.index.showLoading({ title: "保存中" });
      const action = this.editMode ? "update" : "add";
      common_vendor._r.callFunction({
        name: "concert-admin",
        data: {
          action,
          data: this.formData
        },
        success: (res) => {
          common_vendor.index.hideLoading();
          if (res.result.code === 0) {
            common_vendor.index.showToast({
              title: this.editMode ? "更新成功" : "添加成功",
              icon: "success"
            });
            this.closeDialog();
            this.page = 1;
            this.loadData(true);
          } else {
            common_vendor.index.showToast({
              title: res.result.message || "保存失败",
              icon: "none"
            });
          }
        },
        fail: (err) => {
          common_vendor.index.hideLoading();
          common_vendor.index.__f__("error", "at pages/concert/admin.vue:433", "保存失败", err);
          common_vendor.index.showToast({
            title: "保存失败",
            icon: "none"
          });
        }
      });
    },
    // 获取类型样式类名
    getTypeClass(type) {
      const typeMap = {
        "演唱会": "type-concert",
        "音乐节": "type-festival",
        "其他": "type-other"
      };
      return typeMap[type] || "type-other";
    },
    // 关闭弹窗
    closeDialog() {
      this.$refs.popup.close();
    }
  }
};
if (!Array) {
  const _easycom_uni_datetime_picker2 = common_vendor.resolveComponent("uni-datetime-picker");
  const _easycom_uni_popup2 = common_vendor.resolveComponent("uni-popup");
  (_easycom_uni_datetime_picker2 + _easycom_uni_popup2)();
}
const _easycom_uni_datetime_picker = () => "../../uni_modules/uni-datetime-picker/components/uni-datetime-picker/uni-datetime-picker.js";
const _easycom_uni_popup = () => "../../uni_modules/uni-popup/components/uni-popup/uni-popup.js";
if (!Math) {
  (_easycom_uni_datetime_picker + _easycom_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.showAddDialog && $options.showAddDialog(...args), "88"),
    b: common_vendor.t($data.typeList[$data.typeIndex].label),
    c: common_vendor.o((...args) => $options.onTypeChange && $options.onTypeChange(...args), "b7"),
    d: $data.typeIndex,
    e: $data.typeList,
    f: common_vendor.o((...args) => $options.handleSearch && $options.handleSearch(...args), "50"),
    g: $data.searchKeyword,
    h: common_vendor.o(($event) => $data.searchKeyword = $event.detail.value, "79"),
    i: common_vendor.o((...args) => $options.handleSearch && $options.handleSearch(...args), "ff"),
    j: common_vendor.t($data.totalCount),
    k: common_vendor.f($data.concertList, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.type),
        b: common_vendor.n($options.getTypeClass(item.type)),
        c: common_vendor.o(($event) => $options.editConcert(item), item._id),
        d: common_vendor.o(($event) => $options.deleteConcert(item), item._id),
        e: common_vendor.t(item.ychTheme || "未设置"),
        f: common_vendor.t(item.yhcTheme || "未设置"),
        g: common_vendor.t(item.Session || "未设置"),
        h: common_vendor.t(item.time || "未设置"),
        i: common_vendor.t(item.address || "未设置"),
        j: item.playlist
      }, item.playlist ? {
        k: common_vendor.t(item.playlist)
      } : {}, {
        l: item.bz
      }, item.bz ? {
        m: common_vendor.t(item.bz)
      } : {}, {
        n: item._id
      });
    }),
    l: $data.concertList.length === 0 && !$data.loading
  }, $data.concertList.length === 0 && !$data.loading ? {} : {}, {
    m: $data.hasMore && $data.concertList.length > 0
  }, $data.hasMore && $data.concertList.length > 0 ? {
    n: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args), "da")
  } : {}, {
    o: common_vendor.t($data.editMode ? "编辑" : "添加"),
    p: common_vendor.t($data.typeList[$data.formTypeIndex].label),
    q: common_vendor.o((...args) => $options.onFormTypeChange && $options.onFormTypeChange(...args), "d0"),
    r: $data.formTypeIndex,
    s: $data.typeList,
    t: $data.formData.ychTheme,
    v: common_vendor.o(($event) => $data.formData.ychTheme = $event.detail.value, "f4"),
    w: $data.formData.yhcTheme,
    x: common_vendor.o(($event) => $data.formData.yhcTheme = $event.detail.value, "ae"),
    y: $data.formData.Session,
    z: common_vendor.o(($event) => $data.formData.Session = $event.detail.value, "50"),
    A: common_vendor.o(($event) => $data.formData.time = $event, "0e"),
    B: common_vendor.p({
      type: "datetime",
      placeholder: "请选择时间",
      modelValue: $data.formData.time
    }),
    C: common_vendor.t($data.provinceList[$data.provinceIndex] || "请选择省份"),
    D: common_vendor.o((...args) => $options.onProvinceChange && $options.onProvinceChange(...args), "9a"),
    E: $data.provinceIndex,
    F: $data.provinceList,
    G: $data.formData.address,
    H: common_vendor.o(($event) => $data.formData.address = $event.detail.value, "09"),
    I: $data.formData.playlist,
    J: common_vendor.o(($event) => $data.formData.playlist = $event.detail.value, "f0"),
    K: $data.formData.bz,
    L: common_vendor.o(($event) => $data.formData.bz = $event.detail.value, "31"),
    M: common_vendor.o((...args) => $options.closeDialog && $options.closeDialog(...args), "d8"),
    N: common_vendor.o((...args) => $options.submitForm && $options.submitForm(...args), "7a"),
    O: common_vendor.sr("popup", "6fbbadc0-0"),
    P: common_vendor.p({
      type: "center"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/concert/admin.js.map
