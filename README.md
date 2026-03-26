# Release Scripts

项目包含两个 PowerShell 脚本：

- `scripts/bump-version.ps1`: 同时更新油猴头部 `@version` 和脚本内部 `VERSION` 常量
- `scripts/release.ps1`: 运行语法检查并导出 `resume-autofill-universal.zip`

## 当前能力

- 多简历档案切换
- 上传并解析 `PDF / DOCX / TXT / 图片 OCR`
- 结构化模板可视化编辑
- 自定义问答关键词与优先级
- 通用字段映射
- 站点规则配置
- 通用招聘站自动填写
- 站点专项适配入口
  - 牛客 `nowcoder.com`
  - BOSS 直聘 `zhipin.com`
  - 智联招聘 `zhaopin.com`
  - 前程无忧 / 应届生 `51job.com` / `yingjiesheng.com`
  - 拉勾 `lagou.com`
  - 实习僧 `shixiseng.com`

## 使用

1. 安装 Tampermonkey。
2. 导入或打开 `resume-autofill-universal.user.js`。
3. 打开招聘网站页面。
4. 点击右下角 `简历自动填表`。
5. 在 `简历` 和 `字段模板` 页维护数据。
6. 在 `字段映射` 页校正站点字段。
7. 在 `自动填写` 页执行填表。

## 发布

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1
```

## 版本号更新

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bump-version.ps1 -Version 0.3.0
```

更多测试与兼容性说明见 `TESTING.md`。
