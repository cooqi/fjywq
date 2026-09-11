"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      loading: true,
      concert: null,
      userInfo: {},
      showIndex: 1,
      distance: 0,
      departureProvince: "",
      arrivalProvince: "",
      transportMode: "plane",
      allConcerts: []
    };
  },
  computed: {
    holderName() {
      return this.userInfo.nickName || this.userInfo.name || "青宇";
    },
    dateYear() {
      if (!this.concert || !this.concert.time)
        return "----";
      return String(new Date(this.concert.time).getFullYear());
    },
    dateMonth() {
      if (!this.concert || !this.concert.time)
        return "--";
      return String(new Date(this.concert.time).getMonth() + 1).padStart(2, "0");
    },
    dateDay() {
      if (!this.concert || !this.concert.time)
        return "--";
      return String(new Date(this.concert.time).getDate()).padStart(2, "0");
    },
    showIndexStr() {
      return String(this.showIndex).padStart(2, "0");
    },
    arrivalCity() {
      if (!this.concert)
        return "";
      return this.extractCityName(this.concert.address) || this.arrivalProvince;
    },
    routeTag() {
      return this.departureProvince === this.arrivalProvince ? "省内奔赴" : "跨省奔赴";
    },
    barcodeBars() {
      const seed = this.showIndex * 7 + 13;
      const bars = [];
      let s = seed;
      for (let i = 0; i < 30; i++) {
        s = s * 1103515245 + 12345 & 2147483647;
        bars.push(3 + s % 5 * 2);
      }
      return bars;
    },
    barcodeText() {
      const seed = this.showIndex * 31 + 7;
      let s = seed;
      const digits = [];
      for (let i = 0; i < 8; i++) {
        s = s * 1103515245 + 12345 & 2147483647;
        digits.push(s % 10);
      }
      return digits.join(" ");
    }
  },
  onLoad(options) {
    try {
      const userInfo = common_vendor.index.getStorageSync("userInfo");
      this.userInfo = JSON.parse(userInfo);
    } catch (e) {
    }
    if (options.id) {
      this.loadDetail(options.id);
    } else if (options.payInfo) {
      try {
        const payInfo = JSON.parse(decodeURIComponent(options.payInfo));
        this.loading = false;
        this.concert = {
          _id: "",
          time: payInfo.payTime || "",
          address: payInfo.adress || "",
          Province: payInfo.Province || "",
          ychTheme: payInfo.payName || "",
          yhcTheme: "",
          type: payInfo.payType || ""
        };
        this.arrivalProvince = payInfo.Province || "未知";
        this.departureProvince = this.userInfo.Province || "未设置";
        this.loadAllConcerts();
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/footprint/detail.vue:199", "解析payInfo失败:", e);
        this.loading = false;
      }
    } else {
      this.loading = false;
    }
  },
  methods: {
    loadDetail(id) {
      this.loading = true;
      common_vendor._r.callFunction({
        name: "concert-admin",
        data: { action: "getList", page: 1, pageSize: 100 },
        success: (res) => {
          this.loading = false;
          if (res.result.code === 0) {
            const list = res.result.data.list || [];
            this.allConcerts = list;
            this.allConcerts.sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
            const idx = this.allConcerts.findIndex((item) => item._id === id);
            if (idx > -1) {
              this.concert = this.allConcerts[idx];
              this.showIndex = idx + 1;
              this.arrivalProvince = this.concert.Province || "未知";
              this.departureProvince = this.userInfo.Province || "未设置";
              if (idx > 0) {
                const prev = this.allConcerts[idx - 1];
                const prevCoords = this.getCityCoords(this.extractCityName(prev.address) || prev.Province);
                const currCoords = this.getCityCoords(this.extractCityName(this.concert.address) || this.concert.Province);
                if (prevCoords && currCoords) {
                  this.distance = Math.round(this.calculateDistance(prevCoords.lng, prevCoords.lat, currCoords.lng, currCoords.lat));
                }
              }
            }
          }
        },
        fail: (err) => {
          this.loading = false;
          common_vendor.index.__f__("error", "at pages/footprint/detail.vue:235", "加载失败", err);
        }
      });
    },
    loadAllConcerts() {
      common_vendor._r.callFunction({
        name: "concert-admin",
        data: { action: "getList", page: 1, pageSize: 100 },
        success: (res) => {
          if (res.result.code === 0) {
            const list = res.result.data.list || [];
            this.allConcerts = list;
            this.allConcerts.sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
            const currAddr = this.concert.address || "";
            const currTime = this.concert.time || "";
            const idx = this.allConcerts.findIndex((item) => {
              return (item.address || "") === currAddr && (item.time || "") === currTime;
            });
            if (idx > -1) {
              this.showIndex = idx + 1;
              if (idx > 0) {
                const prev = this.allConcerts[idx - 1];
                const prevCoords = this.getCityCoords(this.extractCityName(prev.address) || prev.Province);
                const currCoords = this.getCityCoords(this.extractCityName(this.concert.address) || this.concert.Province);
                if (prevCoords && currCoords) {
                  this.distance = Math.round(this.calculateDistance(prevCoords.lng, prevCoords.lat, currCoords.lng, currCoords.lat));
                }
              }
            } else {
              this.showIndex = this.allConcerts.length + 1;
            }
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/footprint/detail.vue:267", "加载演唱会列表失败", err);
        }
      });
    },
    extractCityName(address) {
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
        "新疆",
        "香港",
        "澳门"
      ];
      let city = address;
      for (let p of provinces) {
        if (city.startsWith(p)) {
          city = city.replace(p, "").trim();
          break;
        }
      }
      const sepIdx = city.search(/[·\s（(]/);
      if (sepIdx > 0)
        city = city.substring(0, sepIdx);
      return city;
    },
    formatDate(timeStr) {
      if (!timeStr)
        return "未设置";
      const d = new Date(timeStr);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    },
    getCityCoords(cityName) {
      const coords = {
        "北京": { lng: 116.4, lat: 39.9 },
        "天津": { lng: 117.2, lat: 39.1 },
        "上海": { lng: 121.5, lat: 31.2 },
        "重庆": { lng: 106.5, lat: 29.6 },
        "广州": { lng: 113.3, lat: 23.1 },
        "深圳": { lng: 114.1, lat: 22.5 },
        "杭州": { lng: 120.2, lat: 30.3 },
        "南京": { lng: 118.8, lat: 32.1 },
        "成都": { lng: 104.1, lat: 30.7 },
        "武汉": { lng: 114.3, lat: 30.6 },
        "西安": { lng: 108.9, lat: 34.3 },
        "长沙": { lng: 112.9, lat: 28.2 },
        "郑州": { lng: 113.6, lat: 34.8 },
        "济南": { lng: 117, lat: 36.7 },
        "青岛": { lng: 120.3, lat: 36.1 },
        "大连": { lng: 121.6, lat: 38.9 },
        "沈阳": { lng: 123.4, lat: 41.8 },
        "哈尔滨": { lng: 126.6, lat: 45.8 },
        "昆明": { lng: 102.7, lat: 25 },
        "贵阳": { lng: 106.7, lat: 26.6 },
        "南宁": { lng: 108.3, lat: 22.8 },
        "福州": { lng: 119.3, lat: 26.1 },
        "厦门": { lng: 118.1, lat: 24.5 },
        "南昌": { lng: 115.9, lat: 28.7 },
        "合肥": { lng: 117.3, lat: 31.9 },
        "太原": { lng: 112.5, lat: 37.9 },
        "石家庄": { lng: 114.5, lat: 38 },
        "兰州": { lng: 103.8, lat: 36.1 },
        "银川": { lng: 106.3, lat: 38.5 },
        "西宁": { lng: 101.8, lat: 36.6 },
        "拉萨": { lng: 91.1, lat: 29.6 },
        "乌鲁木齐": { lng: 87.6, lat: 43.8 },
        "呼和浩特": { lng: 111.7, lat: 40.8 },
        "澳门": { lng: 113.5, lat: 22.2 },
        "香港": { lng: 114.2, lat: 22.3 },
        "丽水": { lng: 119.9, lat: 28.5 },
        "襄阳": { lng: 112.1, lat: 32 },
        "恩施": { lng: 109.5, lat: 30.3 },
        "嘉兴": { lng: 120.8, lat: 30.8 },
        "佛山": { lng: 113.1, lat: 23 },
        "东莞": { lng: 113.8, lat: 23 },
        "珠海": { lng: 113.6, lat: 22.3 },
        "无锡": { lng: 120.3, lat: 31.6 },
        "苏州": { lng: 120.6, lat: 31.3 },
        "宁波": { lng: 121.5, lat: 29.9 },
        "温州": { lng: 120.7, lat: 28 },
        "常州": { lng: 119.9, lat: 31.8 },
        "徐州": { lng: 117.2, lat: 34.2 },
        "烟台": { lng: 121.4, lat: 37.5 },
        "潍坊": { lng: 119.2, lat: 36.7 },
        "洛阳": { lng: 112.4, lat: 34.6 },
        "宜昌": { lng: 111.3, lat: 30.7 },
        "株洲": { lng: 113.1, lat: 27.8 },
        "桂林": { lng: 110.3, lat: 25.3 },
        "柳州": { lng: 109.4, lat: 24.3 },
        "绵阳": { lng: 104.7, lat: 31.5 },
        "大理": { lng: 100.2, lat: 25.6 },
        "丽江": { lng: 100.2, lat: 26.9 },
        "三亚": { lng: 109.5, lat: 18.3 },
        "秦皇岛": { lng: 119.6, lat: 39.9 }
      };
      for (let city in coords) {
        if (cityName.includes(city))
          return coords[city];
      }
      return null;
    },
    calculateDistance(lng1, lat1, lng2, lat2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loading
  }, $data.loading ? {} : $data.concert ? {
    c: common_vendor.t($data.concert.ychTheme || $data.concert.type || "演出"),
    d: common_vendor.t($data.concert.ychTheme ? $data.userInfo.nickName || "青宇" : $data.concert.type || "演出"),
    e: common_vendor.t($data.concert.ychTheme ? "ARTIST" : "PERFORMANCE"),
    f: common_vendor.t($options.dateYear),
    g: common_vendor.t($options.dateMonth),
    h: common_vendor.t($options.dateDay),
    i: common_vendor.t($options.holderName),
    j: common_vendor.t($data.showIndex),
    k: common_vendor.t($data.concert.address || "未知"),
    l: common_vendor.t($data.departureProvince),
    m: common_vendor.t($data.arrivalProvince),
    n: common_vendor.t($options.routeTag),
    o: common_vendor.t($options.showIndexStr),
    p: common_vendor.f($options.barcodeBars, (w, i, i0) => {
      return {
        a: i,
        b: w + "rpx"
      };
    }),
    q: common_vendor.t($data.departureProvince),
    r: common_vendor.t($data.arrivalProvince),
    s: common_vendor.t($options.arrivalCity),
    t: common_vendor.t($options.routeTag)
  } : {}, {
    b: $data.concert
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/footprint/detail.js.map
