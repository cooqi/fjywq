# wn-calendar 展示打卡日历组件

> 主打就是轻巧无依赖，自己易改

## 安装

本组件符合easycom规范，只需将本组件导入项目即可直接使用。

## 基本用法

`template`中使用组件
```html
<view class="container">
  <wn-calendar 
    ref="calendar" 
    :data="[{date:'2023/5/25', text:'显示文本', type: 2}]" 
    :isBorder="true" 
    :isLess="false" 
    :colors="['#f3a73f', '#2979ff', '#8f939c', '#18bc37', '#e43d33']" 
		:isEn="false"
		format="/"
    @change="onChange" 
    @choose="onChoose" 
  ></wn-calendar>
</view>
```

## API

### Calendar Props

|  属性名	|    类型	| 默认值| 说明																													|
| 		| 																													|
| date		| String	|-		| 打卡，期待格式[{date:'2023/05/25',text:'显示文本',type:2}]，date格式是斜杠兼容iOS，type对应colors数组下标控制文本色彩																							|
| colors		| Array<String>	| ['#2979ff', '#18bc37', '#f3a73f', '#e43d33', '#8f939c'] | 文本色彩控制																												|
| isLess	| Boolean	| false			| 是否不显示非当月的日期。改变后需调用this.$refs.calendar.refresh。																								|
| isBorder	| Boolean	| true		| 是否显示下边框																									|
| isEn	| Boolean	| false		| 是否英文																									|
| format	| String | ''			| 控制月份格式，默认显示'2023年5月'，传'/'显示'2023/5'																									|

### Calendar Events

|  事件名		| 说明								|返回值|
| 								|		| 									|
| choose	| 选中日期	| {date:'2023/5/25',data:{date:'2023/05/25',text:'显示文本',type:2}} 	|
| change	| 切换月份 | {year:2023,month:5} 	|

### Calendar Ref

通过`this.$refs.calendar`实例调用内部方法

|  事件名		| 说明								|返回值|
| 								|		| 									|
| refresh	| 刷新日期	|- 	|