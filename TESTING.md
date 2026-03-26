# Testing Checklist

## Supported sites

- `nowcoder.com`
- `zhipin.com`
- `zhaopin.com`
- `51job.com`
- `yingjiesheng.com`
- `lagou.com`
- `shixiseng.com`

## Baseline checks

- 油猴脚本能正常加载
- 右下角悬浮按钮正常显示
- 面板能正常打开并切换标签页
- 本地简历数据不会自动上传到外部服务

## Resume import

- 导入 PDF 文本层简历
- 导入扫描版 PDF 并触发 OCR
- 导入 DOCX
- 导入图片简历
- 导入 JSON 档案

## Template system

- 新增教育经历卡片
- 新增项目经历卡片
- 新增实习经历卡片
- 新增奖项卡片
- 新增证书卡片
- 新增自定义问答卡片
- 修改关键词与优先级后自动保存
- 模板同步到普通文本字段

## Autofill checks

- 只填空白字段
- 覆盖填写
- 仅填已映射字段
- 原生 `input / textarea / select`
- Ant Design 组件
- Element 组件
- `contenteditable` 富文本字段

## Multi-entry experience checks

- 第 1 段项目表单填入第 1 个项目模板
- 第 2 段项目表单填入第 2 个项目模板
- 第 3 段项目表单填入第 3 个项目模板
- 实习和教育经历同理

## Q&A checks

- 匹配“为什么选择我们”
- 匹配“你的优点是什么”
- 匹配“你的缺点是什么”
- 匹配“你的职业规划是什么”
- 更高优先级模板优先命中

## Compatibility notes

- 各站登录后的真实简历编辑页结构可能随时间变化
- 自定义问答和多段经历仍依赖页面标签、占位符、父容器文本进行推断
- 若页面字段命名非常特殊，需在 `字段映射` 页手动修正
- 若站点使用强封装 Shadow DOM，当前版本命中率会下降
- 若页面为多步弹窗流程，建议逐步打开面板执行扫描和填写
