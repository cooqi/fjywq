"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      userInfo: {},
      loading: false,
      provinceList: [],
      // 省份列表
      totalConcerts: 0
      // 总场次
    };
  },
  onLoad() {
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    if (userInfo) {
      this.userInfo = JSON.parse(userInfo);
      if (this.userInfo._id) {
        this.loadFootprint();
      }
    }
  },
  onShow() {
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    if (userInfo) {
      this.userInfo = JSON.parse(userInfo);
      if (this.userInfo._id) {
        this.loadFootprint();
      }
    }
  },
  methods: {
    // 加载足迹数据
    loadFootprint() {
      if (!this.userInfo._id)
        return;
      this.loading = true;
      common_vendor._r.callFunction({
        name: "pay-record",
        data: {
          type: "get",
          userId: this.userInfo._id,
          payType: ["演唱会", "音乐节"]
        },
        success: (res) => {
          this.loading = false;
          if (res.result.code === 0 && res.result.data) {
            const records = res.result.data || [];
            this.totalConcerts = records.length;
            this.processFootprintData(records);
          }
        },
        fail: (err) => {
          this.loading = false;
          common_vendor.index.__f__("error", "at pages/footprint/footprint.vue:114", "加载足迹失败:", err);
          common_vendor.index.showToast({
            title: "加载失败",
            icon: "none"
          });
        }
      });
    },
    // 处理足迹数据
    processFootprintData(records) {
      const provinceMap = {};
      records.forEach((record) => {
        let province = "";
        let city = "";
        if (record.Province) {
          province = record.Province;
          city = record.adress || "未知城市";
        } else if (record.adress) {
          const address = record.adress;
          province = this.extractProvince(address);
          city = this.extractCity(address);
        }
        if (!province) {
          province = "未知省份";
        }
        if (!city) {
          city = "未知城市";
        }
        if (!provinceMap[province]) {
          provinceMap[province] = {
            name: province,
            count: 1,
            cities: /* @__PURE__ */ new Set([city])
          };
        } else {
          provinceMap[province].count++;
          provinceMap[province].cities.add(city);
        }
      });
      this.provinceList = Object.values(provinceMap).map((item) => ({
        ...item,
        cities: Array.from(item.cities)
      })).sort((a, b) => b.count - a.count);
      common_vendor.index.__f__("log", "at pages/footprint/footprint.vue:170", "足迹数据:", this.provinceList);
    },
    // 从地址中提取省份
    extractProvince(address) {
      if (!address)
        return "";
      const provinces = [
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
      ];
      for (let province of provinces) {
        if (address.includes(province)) {
          return province;
        }
      }
      return "";
    },
    // 从地址中提取城市
    extractCity(address) {
      if (!address)
        return "";
      const province = this.extractProvince(address);
      if (province) {
        return address.replace(province, "").trim();
      }
      return address;
    },
    // 显示省份详情
    showProvinceDetail(province) {
      common_vendor.index.showModal({
        title: province.name,
        content: `共参加 ${province.count} 场
去过：${province.cities.join("、")}`,
        showCancel: false
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.userInfo._id
  }, !$data.userInfo._id ? {} : common_vendor.e({
    b: common_vendor.t($data.provinceList.length),
    c: common_vendor.t($data.totalConcerts),
    d: common_vendor.f($data.provinceList, (province, index, i0) => {
      return {
        a: common_vendor.t(province.name),
        b: common_vendor.t(province.count),
        c: common_vendor.f(province.cities, (city, cIndex, i1) => {
          return {
            a: common_vendor.t(city),
            b: cIndex
          };
        }),
        d: index,
        e: common_vendor.o(($event) => $options.showProvinceDetail(province), index)
      };
    }),
    e: $data.provinceList.length === 0 && !$data.loading
  }, $data.provinceList.length === 0 && !$data.loading ? {} : {}), {
    f: $data.loading
  }, $data.loading ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/footprint/footprint.js.map
