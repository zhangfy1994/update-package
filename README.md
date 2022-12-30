## 前言：

前端项目的 lock 文件会锁定依赖版本， 但是有些公司内部包我们希望能够实时的安装最新版本，使用此工具包可以在启动项目时检查某些依赖包以安装最新版本

## 使用

```bash
pnpm add update-package -D

import updatePackage from "update-package";

updatePackage(["less", "lint-staged", "antd", "lodash"]);
```
