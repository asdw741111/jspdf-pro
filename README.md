# js生成pdf
基于`jspdf`、`html2canvas`

特性:
- 对任意前端元素导出pdf
- 对长内容自动分页
- 支持不跨页元素自动处理
- 支持自定义class实现手动控制分页点、不跨页、不需要向下遍历
- 内容过长会自动拆分处理避免超出canvas高度页面空白


## 安装
```sh
npm install jspdf-pro
```
or
```sh
yarn add jspdf-pro
```


## 生成PDF样式问题汇总
### 1. z-index无效
html2canvas在绘制div到img时忽略了z索引，只遵循div的顺序，所以会导致有些导出效果也页面不一致，解决方案：将zindex元素和所有兄弟元素设置position:relative

### 2. margin-top塌陷
这是css盒子模型问题，如果一个元素前边没有兄弟元素，给它设置了margin-top本意是距离父元素有间距，但是间距效果会到父元素上。解决办法是给父元素设置overflow:hidden
