# Resume Autofill Universal

一个可直接安装到 Tampermonkey 的油猴脚本，用于：

- 上传并管理多份简历档案
- 解析 `PDF / DOCX / TXT / 图片`
- 通过文本提取和 OCR 识别简历字段
- 在招聘网站表单中自动匹配并填写常见字段
- 对 React / Ant Design / Element 等常见站点组件做额外兼容

## 文件

- `resume-autofill-universal.user.js`: 可直接安装的油猴脚本

## 使用

1. 安装 Tampermonkey。
2. 导入或打开 `resume-autofill-universal.user.js`。
3. 打开任意招聘网站页面。
4. 点击右下角 `简历自动填表`。
5. 上传简历文件，检查解析出的字段。
6. 选择当前档案，点击 `自动填写当前页面`。

## 当前实现范围

- 通用表单识别：`input` / `textarea` / `select` / `contenteditable`
- 常见组件识别：Ant Design、Element、带 `combobox` / `option` 角色的自定义组件
- 多简历切换：脚本内部保存多个档案，可手动切换
- OCR：对图片直接 OCR；PDF 页面无文本层时，会回退到 OCR

## 注意

- 脚本采用前端本地解析，不会主动把简历上传到你的服务器。
- 第三方库通过 CDN 加载，首次使用 OCR/PDF 解析时依赖外部资源可访问。
- 不同招聘网站字段命名差异较大，复杂站点可能仍需要你在 UI 中手动修正后再填充。
