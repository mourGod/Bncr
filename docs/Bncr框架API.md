# Bncr 框架内置 API 完整手册

> 来源：`/bncr/BncrData/@types/Bncr.d.ts`、官方插件、数据库中间件、源码注释
> 生成路径：`/bncr/BncrData/docs/Bncr框架API.md`
>
> ⚠️ **阅读说明（重要）**
> - 本文档同时参考了类型声明与运行时插件实现，若两者描述有差异，请以当前版本运行时行为为准。
> - 部分 API（如 `sysMethod.isWebLogin`）由官方插件动态注入，未加载对应插件时不可用。

---

## 目录

0. [全局变量一览](#零全局变量一览)
1. [BncrJSLogger — 全局日志对象](#一bncrjslogger--全局日志对象)
2. [sysMethod — 系统方法集合](#二sysmethod--系统方法集合)
   - [基础属性](#21-基础属性)
   - [日志方法](#22-日志方法)
   - [sleep — 等待](#23-sleepsecond)
   - [getTime — 获取时间](#24-gettimeformat)
   - [osPlatform — 获取平台](#25-osplatform)
   - [isDev — 是否开发者](#26-isdev)
   - [push — 推送消息](#27-pushpushinfo)
   - [pushAdmin — 推送给管理员](#28-pushadminpushinfo)
   - [inline — 内部触发命令](#29-inlinemsg-name)
   - [npmInstall — 安装包](#210-npminstallstr-opts)
   - [testModule — 检测包](#211-testmodulestrarr-opt)
   - [createStartupCompletionHook — 启动钩子](#212-createstartupcompletionhookname-callback)
   - [getSubscriptionUrl — 生成订阅链接](#213-getsubscriptionurlkey-opt)
   - [getDecSubscriptionUrl — 解析订阅链接](#214-getdecsubscriptionurlkey-data)
   - [isWebLogin — 验证 Web Token](#215-isweblogintoken)
   - [cron — 定时器](#216-cron-定时器)
3. [BncrDB — 数据库](#三bncrdb--数据库)
   - [构造函数](#31-构造函数)
   - [get — 读取](#32-getkey-def-bool)
   - [set — 写入](#33-setkey-value-opt)
   - [del — 删除](#34-delkey-def)
   - [keys — 所有键](#35-keys)
   - [getAllForm — 所有表名](#36-getallform)
   - [watch — 监听变更](#37-watchwatchinfo)
   - [unWatch — 取消监听](#38-unwatchwatchinfo)
4. [Sender — 插件上下文对象](#四sender--插件上下文对象)
   - [getMsg](#41-getmsg)
   - [setMsg](#42-setmsgmsg)
   - [param](#43-paramk)
   - [getMsgId](#44-getmsgid)
   - [getUserId](#45-getuserid)
   - [getUserName](#46-getusername)
   - [getGroupId](#47-getgroupid)
   - [getGroupName](#48-getgroupname)
   - [getFrom](#49-getfrom)
   - [isAdmin](#410-isadmin)
   - [reply](#411-replymsg)
   - [delMsg](#412-delmsgmsgidArr)
   - [waitInput](#413-waitinputcallback-time)
   - [inlineSugar](#414-inlinesugarimsg)
   - [again](#415-againreplyinfo)
   - [isWaitDel](#416-iswaitdelargsarr)
5. [BncrPluginConfig — 插件配置](#五bncrpluginconfig--插件配置)
6. [BncrCreateSchema — Schema 构建工具](#六bncrcreatesschema--schema-构建工具)
7. [Adapter — 适配器](#七adapter--适配器)
8. [router — 全局路由](#八router--全局路由)
9. [RunningInformation — 运行信息](#九runninginformation--运行信息)
10. [DatabaseInstantiationObject — 数据库实例注册表](#十databaseinstantiationobject--数据库实例注册表)
11. [String 颜色扩展](#十一string-颜色扩展)
12. [消息体类型定义](#十二消息体类型定义)
13. [插件元数据注解](#十三插件元数据注解)
14. [插件云认证接口](#十四插件云认证接口)
15. [数据库中间件底层方法](#十五数据库中间件底层方法)
16. [完整使用示例](#十六完整使用示例)

---

## 零、全局变量一览

以下变量由框架在**启动时自动注入全局作用域**，插件和模块中**无需 `require`，直接使用即可**。

> ⚠️ 千万不要写 `const BncrDB = require('BncrDB')` 这类代码——这些变量框架已经注入，多余的 require 会报错或取到错误的对象。

| 全局变量 | 类型 | 说明 |
|----------|------|------|
| `BncrJSLogger` | `log4js.Logger` | 框架统一日志实例，所有日志输出推荐用它 |
| `sysMethod` | `object` | 框架核心方法集：定时器、推送、安装包、获取时间等 |
| `BncrDB` | `class` | K-V 数据库构造器，`new BncrDB('表名')` 即可 |
| `BncrPluginConfig` | `class` | 插件配置读取器，与 `BncrCreateSchema` 配合使用 |
| `BncrCreateSchema` | `object` | 插件配置 Schema 构建工具，定义 Web 面板配置表单 |
| `Adapter` | `class` | 适配器构造器，用于接入自定义 IM 平台 |
| `router` | `express.Router` | Express 路由实例，注册 HTTP / WebSocket 接口 |
| `RunningInformation` | `object` | 框架运行状态与统计数据（只读） |
| `DatabaseInstantiationObject` | `object` | 已注册的自定义数据库实例字典（只读） |

```js
// ✅ 正确 — 直接用，不需要任何 require
const db = new BncrDB('myPlugin');
const log = BncrJSLogger;
router.get('/my/api', (req, res) => res.json({ ok: true }));

// ❌ 错误 — 这些不是 npm 包，require 会找不到
const BncrDB = require('BncrDB');          // 错误
const sysMethod = require('sysMethod');    // 错误
```

---

## 一、BncrJSLogger — 全局日志对象

**类型：** `log4js.Logger`（框架已配置好的实例，直接挂在全局）

### 为什么要用 BncrJSLogger 而不是自己 require

框架启动时会统一配置 log4js（包括 appender、格式、颜色），并将实例注入全局 `BncrJSLogger`。
如果自行 `require('log4js').getLogger('xxx')` 创建新实例，不会继承框架的 appender，**日志将没有任何输出**。

```js
// ✅ 正确写法（优先用框架实例，降级到独立实例）
const log = BncrJSLogger || require('log4js').getLogger('myModule');

// ❌ 错误写法（框架未配置时无输出）
const log = require('log4js').getLogger('myModule');
```

### 方法列表


| 方法 | 颜色 | 说明 |
|------|------|------|
| `log.trace(...args)` | 灰色 | 最详细的调试信息，一般不用 |
| `log.debug(...args)` | 青色 | 调试信息 |
| `log.info(...args)` | 绿色 | 一般信息 |
| `log.warn(...args)` | **黄色** | 警告，重要提示 |
| `log.error(...args)` | 红色 | 错误信息 |
| `log.fatal(...args)` | 红色加粗 | 致命错误 |


### 输出格式

```
[2026-02-27T18:55:31.467] [WARN] redis_tool.js - redis 链接成功
[2026-02-27T18:55:31.467] [ERROR] myModule - 发生错误: xxx
```

### 使用示例

```js
const log = BncrJSLogger || require('log4js').getLogger('redis_tool.js');

log.warn('redis 链接成功');
log.error('连接失败:', err.message);
log.info(`当前版本: ${sysMethod.Version}`);
log.debug('调试数据:', JSON.stringify(data));
```

---

## 二、sysMethod — 系统方法集合

框架核心全局对象，插件和 module 均可直接使用，无需引入。

---

### 2.1 基础属性

#### 核心只读属性


| 属性 | 类型 | 说明 |
|------|------|------|
| `sysMethod.Version` | `string` | 框架版本号，如 `"3.1.0"`，可用于判断最低版本兼容 |
| `sysMethod.MachineId` | `string` | 当前机器唯一 ID，用于云认证、授权校验等场景 |
| `sysMethod.WorkMod` | `string` | 运行模式：`'develop'` / `'alpha'` / `'production'` |
| `sysMethod.systemDir` | `string` | 系统根目录绝对路径，如 `/bncr` |
| `sysMethod.runWorkDir` | `string` | 数据工作目录路径，通常为 `/bncr/BncrData` |
| `sysMethod.config` | `object` | `config.json` 完整内容，包含所有系统级配置 |
| `sysMethod.lock` | `boolean` | `true` 表示系统锁定中，普通命令不被处理 |


#### 启动状态属性

`sysMethod.systemStatus` 记录各模块是否已完成初始化，常在启动钩子中判断。


| `systemStatus` 字段 | 类型 | 说明 |
|---------------------|------|------|
| `.adapter` | `boolean` | 用户自定义适配器是否已全部启动完成 |
| `.plugins` | `boolean` | 所有插件是否已加载完成 |
| `.systemAdapter` | `boolean` | 系统内置适配器（ssh/web 等）是否已启动完成 |


#### 系统配置属性

`sysMethod.systemConfig` 来自框架内部配置，开发者通常只读不写。


| `systemConfig` 字段 | 类型 | 说明 |
|---------------------|------|------|
| `.token` | `string` | 系统 token，Web 管理面板登录凭证的签名密钥 |
| `.sysLogOpen` | `boolean` | 是否开启系统运行日志输出 |
| `.msgLogOpen` | `number` | 消息日志级别开关，`0` 为关闭 |
| `.developerMode` | `boolean` | 是否处于开发者调试模式 |
| `.AlphaToken` | `string?` | Alpha 版本专用 token（可选） |
| `.ToverifyUrl` | `string` | 云端授权校验 URL |
| `.DisableRouterPathLogs` | `boolean?` | 是否禁用路由请求日志输出 |
| `.pluginsPublishingMode` | `string?` | 插件发布模式：`'sub'` 或 `'github'` |


#### 存储与统计属性

**`sysMethod.SystemStorage.authorizationStatus`**
类型：`{[name:string]:boolean}`
各插件的付费授权状态，key 为插件名，value 为是否已授权。

**`sysMethod.npmInstallInfo`**
类型：`{[pkg:string]:any}`
记录通过 `npmInstall` 安装过的包信息，key 为包名。

```js
// 读取框架版本
log.info('当前框架版本:', sysMethod.Version);

// 判断运行环境
if (sysMethod.WorkMod === 'production') {
  // 生产环境逻辑
}

// 等框架启动完成后再执行
sysMethod.createStartupCompletionHook('myInit', async () => {
  // 此时 systemStatus 均为 true
  log.info('适配器已启动:', sysMethod.systemStatus.adapter);
  log.info('插件已加载:', sysMethod.systemStatus.plugins);
});

// 检查插件授权状态
const authorized = sysMethod.SystemStorage.authorizationStatus['myPlugin'];
```

---

### 2.2 日志方法

> 这三个方法是框架内部日志通道，插件开发中**建议优先使用 `BncrJSLogger`**。
> 以下三个方法受 `systemConfig.sysLogOpen`、`systemConfig.msgLogOpen` 开关控制，
> 开关关闭时调用这些方法不会有任何输出。

#### `sysMethod.sysOutLogs(...params)`

系统运行日志通道。
用于输出框架内部运行状态信息，受 `sysLogOpen` 开关控制。
插件一般用 `BncrJSLogger.info()` 代替，效果相同但不受该开关限制。

```
参数：...params  any[]  任意数量、任意类型的日志内容
返回值：void
```

```js
sysMethod.sysOutLogs('适配器已启动', adapterName);
// 等效于（但受开关控制）：
BncrJSLogger.info('适配器已启动', adapterName);
```

#### `sysMethod.msgOutLogs(mark, ...params)`

消息处理日志通道（异步）。
用于记录每条用户消息的接收、路由、处理过程，受 `msgLogOpen` 数值开关控制。
`mark` 用于标记消息的处理阶段，框架内部用固定数字区分阶段（如 1=接收，2=处理，3=拦截）。

```
参数：
  mark      number  日志阶段标记数字（框架内部定义）
  ...params any[]   日志内容

返回值：Promise<void>
```

```js
// 框架内部调用，插件一般不需要直接使用
await sysMethod.msgOutLogs(1, '收到消息', userId, msg);
```

#### `sysMethod.startOutLogs(...params)`

启动过程日志通道。
仅在框架启动阶段有效，用于输出初始化过程的状态信息。
框架完全启动后调用此方法通常无效，应改用 `BncrJSLogger`。

```
参数：...params  any[]  任意数量、任意类型的日志内容
返回值：void
```

```js
// 仅在启动阶段（如模块顶层代码）使用
sysMethod.startOutLogs('myModule 初始化完成');
```

---

### 2.3 `sleep(second)`

**作用：** 异步等待，暂停执行指定秒数。

```
参数：
  second  number  等待的秒数

返回值：Promise<void>
```

```js
// 等待 3 秒
await sysMethod.sleep(3);

// 常见用法：限速，避免接口请求过快
for (const item of list) {
  await doRequest(item);
  await sysMethod.sleep(1); // 每次请求间隔 1 秒
}
```

---

### 2.4 `getTime(format)`

**作用：** 获取格式化的当前系统时间字符串。

```
参数：
  format  'hh:mm:ss' | 'yyyy-MM-dd' | 'yyyy-MM-dd hh:mm:ss' | 'yyyy-MM-dd-hh-mm-ss'

返回值：string | number
```


| format 值 | 返回示例 |
|-----------|---------|
| `'hh:mm:ss'` | `"18:55:31"` |
| `'yyyy-MM-dd'` | `"2026-02-27"` |
| `'yyyy-MM-dd hh:mm:ss'` | `"2026-02-27 18:55:31"` |
| `'yyyy-MM-dd-hh-mm-ss'` | `"2026-02-27-18-55-31"` |


```js
const now = sysMethod.getTime('yyyy-MM-dd hh:mm:ss');
await s.reply(`当前时间：${now}`);

// 用于生成文件名
const filename = `log-${sysMethod.getTime('yyyy-MM-dd-hh-mm-ss')}.txt`;
```

---

### 2.5 `osPlatform()`

**作用：** 返回 bncr 所运行的操作系统平台名称。

```
参数：无
返回值：string（如 'linux'、'win32'、'darwin'）
```

```js
const platform = sysMethod.osPlatform();
if (platform === 'linux') {
  // Linux 环境下的逻辑
}
```

---

### 2.6 `isDev()`

**作用：** 判断当前用户是否为 dev（付费开发者）用户，用于插件授权校验。

```
参数：无
返回值：boolean
```

```js
const isPaid = sysMethod.isDev();
if (!isPaid) {
  await s.reply('此功能需要授权');
  return;
}
```

---

### 2.7 `push(pushInfo)`

**作用：** 主动向指定平台的指定用户或群组推送消息，不需要用户触发。

```
参数：
  pushInfo.platform  string   必填，目标平台标识（'tgBot'、'qq'、'wechat' 等）
  pushInfo.msg       string   消息文本内容
  pushInfo.userId    string   目标用户 ID（私聊时必填）
  pushInfo.groupId   string   目标群组 ID（群聊时必填，私聊传 '0'）
  pushInfo.path      string   文件路径（发送图片、视频、音频时填写）
  pushInfo.type      string   消息类型：'text'、'image'、'video'、'audio'
  pushInfo.toMsgId   string   要回复的原消息 ID（实现引用回复）

返回值：Promise<string>  —  发出消息的 ID
```

```js
// 推送文字消息给某用户（私聊）
await sysMethod.push({
  platform: 'tgBot',
  userId: '1234567',
  groupId: '0',       // 私聊固定传 '0'
  msg: '你的任务执行完毕'
});

// 推送到某群
await sysMethod.push({
  platform: 'qq',
  groupId: '987654321',
  msg: '系统通知：服务已恢复'
});

// 推送图片
await sysMethod.push({
  platform: 'tgBot',
  userId: '1234567',
  groupId: '0',
  type: 'image',
  path: '/data/img/result.jpg',
  msg: '查询结果图片'
});

// 引用某条消息回复
await sysMethod.push({
  platform: 'tgBot',
  userId: '1234567',
  groupId: '0',
  msg: '已处理',
  toMsgId: 'msgId_abc123'
});
```

---

### 2.8 `pushAdmin(pushInfo)`

**作用：** 同时向多个平台的管理员账号推送消息，常用于系统告警、定时报告等。

```
参数：
  pushInfo.platform  string[]  必填，目标平台标识数组
  pushInfo.msg       string    必填，消息内容

返回值：Promise<string | boolean>
```

```js
// 通知所有平台管理员
await sysMethod.pushAdmin({
  platform: ['tgBot', 'qq'],
  msg: '⚠️ 服务器 CPU 占用率超过 90%'
});

// 只通知 TG 管理员
await sysMethod.pushAdmin({
  platform: ['tgBot'],
  msg: '定时任务执行完毕，共处理 100 条数据'
});
```

---

### 2.9 `inline(msg, name?)`

**作用：** 以系统管理员身份向框架内部发送一条消息，相当于管理员自己在框架内输入了该命令。常用于定时触发某个插件命令。

```
参数：
  msg   string   要发送的消息（命令文本）
  name  string   可选，发送者名称，不传默认为 'system@Admin'

返回值：Promise<undefined>
```

```js
// 每天早上 9 点触发重启命令
sysMethod.cron.newCron('0 0 9 * * *', async () => {
  await sysMethod.inline('重启');
});

// 以指定名字发送
await sysMethod.inline('签到', 'autoBot');
```

---

### 2.10 `npmInstall(str, opts?)`

**作用：** 在运行时安装 npm 包，无需手动进入目录执行命令。

```
参数：
  str            string   npm 包名
  opts.outConsole  boolean  可选，是否将安装过程实时输出到控制台

返回值：Promise<{ status: boolean; data: string } | null>
  - 当 outConsole 为 true 时：实时输出安装日志到控制台，返回值通常为 null
  - 否则返回 { status: true/false, data: '执行信息字符串' }
```

```js
// 安装并获取结果
const result = await sysMethod.npmInstall('ioredis');
if (result.status) {
  log.info('安装成功');
} else {
  log.error('安装失败:', result.data);
}

// 安装并实时输出到控制台
await sysMethod.npmInstall('dayjs', { outConsole: true });
```

---

### 2.11 `testModule(strArr, opt?)`

**作用：** 检测一组 npm 包是否已安装，可选自动安装缺失的包。该方法可直接调用，也可使用 `await`（历史插件中常见）。

```
参数：
  strArr        string[]           要检测的包名数组
  opt.install   boolean（可选）    发现未安装的包时是否立即自动安装

返回值：{ [packageName: string]: any }  —  各包的检测结果对象
```

```js
// 仅检测，不安装（可直接调用）
const result = sysMethod.testModule(['ioredis', 'dayjs', 'axios']);

// 检测并自动安装缺失的（也可使用 await）
await sysMethod.testModule(['ioredis', 'dayjs'], { install: true });
```

---

### 2.12 `createStartupCompletionHook(name, callback)`

**作用：** 注册一个在框架完全启动后执行的钩子函数。所有钩子是**并发执行**的，不是依次执行，因此不同钩子之间不要有数据依赖。

```
参数：
  name      string    钩子的唯一名称，建议保持唯一且不要重复；重复名称的行为请以当前版本实现为准
  callback  Function  异步函数，框架启动完成后调用

返回值：void
```

```js
// 注册启动完成钩子
sysMethod.createStartupCompletionHook('initRedis', async () => {
  log.info('框架启动完成，开始初始化 Redis 连接...');
  await redis.connect();
});

sysMethod.createStartupCompletionHook('sendStartupNotice', async () => {
  await sysMethod.pushAdmin({
    platform: ['tgBot'],
    msg: '✅ 系统已启动'
  });
});
```

> **注意：** 两个钩子并发执行，`initRedis` 和 `sendStartupNotice` 同时开始，`sendStartupNotice` 不会等待 `initRedis` 完成。

---

### 2.13 `getSubscriptionUrl(key, opt)`

**作用：** 生成一个加密的插件订阅 URL，用于分发插件。

```
参数：
  key        string   加密密钥
  opt.url    string   插件源 URL
  opt.author string   作者名
  opt.team   string   团队名

返回值：string  —  生成的订阅 URL
```

```js
const url = sysMethod.getSubscriptionUrl('mySecretKey', {
  url: 'https://example.com/plugins',
  author: 'Doraemon',
  team: '红灯区'
});
```

---

### 2.14 `getDecSubscriptionUrl(key, data)`

**作用：** 解析由 `getSubscriptionUrl` 生成的加密订阅 URL。

```
参数：
  key   string   加密密钥（需与生成时一致）
  data  string   加密的数据字符串

返回值：{ url?: string; author?: string; team?: string }
```

```js
const info = sysMethod.getDecSubscriptionUrl('mySecretKey', encodedData);
console.log(info.url, info.author, info.team);
```

---

### 2.15 `isWebLogin(Token)`

**作用：** 验证 Web 管理面板的 JWT Token 是否有效。由 webApi 插件注入，只有加载了 webApi 插件才可用。

> 建议从请求头中提取纯 Token 字符串后再校验（去掉 `Bearer ` 前缀）。

```
参数：
  Token  string  JWT Token 字符串

返回值：Promise<number>
  1     — Token 有效，已登录
  3001  — Token 已过期
  401   — 非法请求/Token 无效
```

```js
// 在自定义 Web 路由中验证登录状态
router.get('/myApi/data', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 401, msg: '未提供 Token' });
  }

  const status = await sysMethod.isWebLogin(token);
  if (status !== 1) {
    return res.status(401).json({ code: status, msg: '未登录' });
  }
  res.json({ data: 'ok' });
});
```

---

### 2.16 `cron` — 定时器

基于 `node-cron` 封装，支持标准 cron 表达式（6 位，秒级精度）。

#### `sysMethod.cron.newCron(expression, callback)`

**作用：** 创建一个新的定时任务。

```
参数：
  expression  string    cron 表达式（秒 分 时 日 月 周）
  callback    Function  定时触发时执行的函数

返回值：Task 对象（node-cron 的 ScheduledTask）
  task.stop()   停止该定时任务
  task.start()  重新启动该定时任务
```

**cron 表达式格式：**

```
┌─────────── 秒 (0-59)
│ ┌───────── 分 (0-59)
│ │ ┌─────── 时 (0-23)
│ │ │ ┌───── 日 (1-31)
│ │ │ │ ┌─── 月 (1-12)
│ │ │ │ │ ┌─ 周 (0-7, 0和7都是周日)
* * * * * *
```

```js
// 每天早上 9:00:00 执行
const task = sysMethod.cron.newCron('0 0 9 * * *', async () => {
  await sysMethod.pushAdmin({ platform: ['tgBot'], msg: '早安报告' });
});

// 每隔 30 秒执行一次
sysMethod.cron.newCron('*/30 * * * * *', async () => {
  log.info('30秒心跳');
});

// 每小时整点执行
sysMethod.cron.newCron('0 0 * * * *', async () => {
  log.info('整点报时');
});

// 停止定时任务
task.stop();
```

#### `sysMethod.cron.isCron(expression)`

**作用：** 检测一个字符串是否是合法的 cron 表达式。

```
参数：
  expression  string   要检测的字符串

返回值：boolean
```

```js
const valid = sysMethod.cron.isCron('0 0 9 * * *'); // true
const invalid = sysMethod.cron.isCron('hello');       // false

if (!sysMethod.cron.isCron(userInput)) {
  await s.reply('cron 表达式格式不正确');
  return;
}
```

---

## 三、BncrDB — 数据库

Bncr 内置轻量 K-V 数据库，支持 Nedb（默认）和 Level 两种后端，数据按"表名"隔离。

---

### 3.1 构造函数

```js
const db = new BncrDB(name, opt?)
```

```
参数：
  name              string   数据表名称（同名实例共享数据）
  opt.registerName  string   注册到全局的名字（可选）
  opt.useMiddlewarePath  string  数据库中间件路径（可选）
                            'db/Nedb.ts'  — 使用 NeDB（默认）
                            'db/Level.ts' — 使用 LevelDB
  opt.db            object   自定义数据库实例（可选）
```

```js
// 使用默认 NeDB，表名为 'myPlugin'
const db = new BncrDB('myPlugin');

// 使用自定义 Level 实例
import { Level } from 'level';
import path from 'path';
const MyDB = new Level(path.join(process.cwd(), 'BncrData/db/mydb'), {
  valueEncoding: 'json'
});
const db = new BncrDB('myPlugin', {
  registerName: 'mydb',
  useMiddlewarePath: 'db/Level.ts',
  db: MyDB
});
```

---

### 3.2 `get(key, def?, bool?)`

**作用：** 读取数据库中指定 key 的值。

```
参数：
  key   string   要读取的键名
  def   any      可选，key 不存在时返回的默认值
  bool  boolean  可选，传 true 时返回原始数据详情（含元数据）

返回值：Promise<any>
  - key 存在：返回存储的值
  - key 不存在 + 有 def：返回 def
  - key 不存在 + 无 def：返回 undefined
```

```js
const db = new BncrDB('myPlugin');

// 基本读取（不存在返回 undefined）
const val = await db.get('userName');

// 带默认值（不存在返回 'defaultUser'）
const name = await db.get('userName', 'defaultUser');

// 读取对象（带泛型，TypeScript 用）
const config = await db.get<{ host: string; port: number }>('redisConfig');

// 读取原始数据详情
const raw = await db.get('myKey', undefined, true);
```

---

### 3.3 `set(key, value, opt?)`

**作用：** 向数据库写入或更新一个键值对。

```
参数：
  key         string   键名
  value       any      要存储的值（支持字符串、数字、对象、数组等）
  opt.def     any      可选，设置成功后的返回值（代替 true）
  opt.password  string  可选，给该条数据加密保护

返回值：Promise<boolean | any>
  - 成功且无 def：返回 true
  - 成功且有 def：返回 def 的值
  - 失败：返回 false
```

```js
const db = new BncrDB('myPlugin');

// 存储字符串
await db.set('userName', '张三');

// 存储对象
await db.set('config', { host: '127.0.0.1', port: 6379 });

// 存储数组
await db.set('blackList', ['user1', 'user2']);

// 存储成功后返回指定值
const savedVal = await db.set('count', 100, { def: 100 }); // 返回 100

// 加密存储（读取时也需要密码）
await db.set('secretKey', 'abc123', { password: 'myPwd' });
```

---

### 3.4 `del(key, def?)`

**作用：** 删除数据库中指定的键值对。

```
参数：
  key   string   要删除的键名
  def   any      可选，key 不存在时返回的值（代替 false）

返回值：Promise<boolean | any>
  - 删除成功：返回 true
  - key 不存在 + 无 def：返回 false
  - key 不存在 + 有 def：返回 def
```

```js
const db = new BncrDB('myPlugin');

// 删除
const ok = await db.del('userName'); // true or false

// 带默认值（不存在时返回 null 而不是 false）
const result = await db.del('userName', null);
```

---

### 3.5 `keys()`

**作用：** 获取当前数据表下所有已存储的键名列表。

```
参数：无
返回值：Promise<string[]>
```

```js
const db = new BncrDB('myPlugin');
const allKeys = await db.keys();
// ['userName', 'config', 'blackList', ...]

// 遍历所有键值
for (const key of allKeys) {
  const val = await db.get(key);
  console.log(key, val);
}
```

---

### 3.6 `getAllForm()`

**作用：** 获取整个数据库中所有数据表（表名）的列表。

```
参数：无
返回值：Promise<string[]>
```

```js
const db = new BncrDB('anyTable');
const tables = await db.getAllForm();
// ['myPlugin', 'system', 'users', ...]
```

---

### 3.7 `watch(watchInfo)`

**作用：** 监听某个 key 的写入或删除操作，可在变更前拦截并修改或阻止。

```
参数：
  watchInfo.id        string    监听器的唯一 ID（同 key 下不可重复）
  watchInfo.key       string    要监听的键名
  watchInfo.callback  Function  变更时的回调函数，接收 method 对象：
    method.newValue           any     拦截到的新值（set 事件时）
    method.eventType          string  事件类型：'set' 或 'del'
    method.stop()             void    调用后阻止本次写入/删除
    method.changeValue(val)   void    调用后将写入值替换为 val
  watchInfo.password  string    可选，后续修改/移除监听器需要此密码

返回值：boolean（注册成功返回 true）
```

```js
const db = new BncrDB('myPlugin');

// 监听某 key 的修改
db.watch({
  id: 'countWatcher',
  key: 'count',
  callback: (method) => {
    if (method.eventType === 'set') {
      const newVal = method.newValue;
      console.log('count 即将被设置为:', newVal);

      // 拦截并强制改为最大值 100
      if (newVal > 100) {
        method.changeValue(100);
      }

      // 阻止本次写入（什么都不存）
      // method.stop();
    }

    if (method.eventType === 'del') {
      console.log('count 即将被删除');
      method.stop(); // 阻止删除
    }
  }
});
```

---

### 3.8 `unWatch(watchInfo)`

**作用：** 取消通过 `watch` 注册的监听器。

```
参数：
  watchInfo.id        string  监听器 ID（与 watch 时一致）
  watchInfo.key       string  监听的键名
  watchInfo.password  string  可选，注册时设置了密码则必须传

返回值：boolean
```

```js
db.unWatch({ id: 'countWatcher', key: 'count' });

// 有密码的监听器
db.unWatch({ id: 'secureWatcher', key: 'token', password: 'myPwd' });
```

---

## 四、Sender — 插件上下文对象

每次插件被触发时，框架将 `Sender` 实例作为第一个参数传入，通常命名为 `s`。

```js
module.exports = async (s) => {
  // s 就是 Sender 实例
};
```

---

### 4.1 `getMsg()`

**作用：** 获取用户发送的原始消息文本。

```
参数：无
返回值：string
```

```js
const msg = s.getMsg();
// 用户发 "查询 苹果"，msg === "查询 苹果"
```

---

### 4.2 `setMsg(msg)`

**作用：** 修改当前消息内容（在插件处理流中替换消息文本）。

```
参数：
  msg  any  新的消息内容

返回值：any
```

```js
// 预处理消息，去掉前缀后传给后续逻辑
s.setMsg(s.getMsg().replace(/^查询\s*/, ''));
```

---

### 4.3 `param(k)`

**作用：** 获取触发规则（正则）中第 k 个捕获组的内容，用于解析命令参数。

```
参数：
  k  number  捕获组序号，从 1 开始

返回值：string | undefined
```

```js
// 插件 rule: ^(add|del) (.+) (\d+)$
// 用户发送: "add 苹果 5"

const action = s.param(1); // "add"
const item   = s.param(2); // "苹果"
const count  = s.param(3); // "5"

// 不存在时返回 undefined
const p4 = s.param(4); // undefined
```

---

### 4.4 `getMsgId()`

**作用：** 获取当前消息的 ID，主要用于撤回消息。

```
参数：无
返回值：any（消息 ID 字符串）
```

```js
const msgId = s.getMsgId();
// 5 秒后撤回该消息
await s.delMsg(msgId, { wait: 5 });
```

---

### 4.5 `getUserId()`

**作用：** 获取发送消息的用户 ID。

```
参数：无
返回值：any（用户 ID 字符串）
```

```js
const userId = s.getUserId();
// 存储用户数据时用 userId 作为 key
await db.set(`user:${userId}:score`, 100);
```

---

### 4.6 `getUserName()`

**作用：** 获取发送消息的用户名（昵称）。

```
参数：无
返回值：any（用户名字符串）
```

```js
const name = s.getUserName();
await s.reply(`你好，${name}！`);
```

---

### 4.7 `getGroupId()`

**作用：** 获取消息所在的群组 ID。私聊消息返回 `'0'`。

```
参数：无
返回值：any（群组 ID 字符串，私聊为 '0'）
```

```js
const groupId = s.getGroupId();
if (groupId === '0') {
  await s.reply('这是私聊消息');
} else {
  await s.reply(`这是群聊消息，群 ID: ${groupId}`);
}
```

---

### 4.8 `getGroupName()`

**作用：** 获取消息所在群组的名称。

```
参数：无
返回值：any（群名字符串）
```

```js
const groupName = s.getGroupName();
await s.reply(`当前群组：${groupName}`);
```

---

### 4.9 `getFrom()`

**作用：** 获取消息来源的平台标识。

```
参数：无
返回值：any（平台名字符串，如 'tgBot'、'qq'、'wechat'、'HumanTG' 等）
```

```js
const platform = s.getFrom();
if (platform === 'tgBot') {
  // Telegram 专有逻辑
} else if (platform === 'qq') {
  // QQ 专有逻辑
}
```

---

### 4.10 `isAdmin()`

**作用：** 判断当前消息是否来自管理员账号。

```
参数：无
返回值：Promise<boolean>
```

```js
// 权限守卫
if (!await s.isAdmin()) {
  await s.reply('❌ 此命令仅管理员可用');
  return;
}

// 执行管理员操作...
```

---

### 4.11 `reply(msg)`

**作用：** 向当前对话回复消息，支持文本和多媒体。

```
参数：
  msg  string | replyInfo  消息内容

  当 msg 为 string 时，直接发送文本。
  当 msg 为 replyInfo 对象时：
    msg.type      string  消息类型：'text'、'image'、'video'、'audio'
    msg.msg       string  文本内容（text 类型必填）
    msg.path      string  文件路径（image/video/audio 必填，支持本地路径和 URL）
    msg.userId    string  可选，指定目标用户
    msg.groupId   string  可选，指定目标群组
    msg.toMsgId   string  可选，要引用回复的消息 ID

返回值：Promise<string>  —  发出消息的 ID
```

```js
// 回复文本
await s.reply('操作成功');

// 回复文本（对象形式）
await s.reply({ type: 'text', msg: '操作成功' });

// 回复本地图片
await s.reply({
  type: 'image',
  path: '/data/img/result.jpg',
  msg: '查询结果'  // 图片说明文字（可选）
});

// 回复网络图片
await s.reply({
  type: 'image',
  path: 'https://example.com/avatar.png'
});

// 回复视频
await s.reply({
  type: 'video',
  path: '/data/video/demo.mp4'
});

// 回复音频
await s.reply({
  type: 'audio',
  path: '/data/audio/voice.mp3'
});

// 引用某条消息回复
const sentMsgId = await s.reply('收到！');
```

---

### 4.12 `delMsg(...msgIdArr)`

**作用：** 撤回指定的消息。最后一个参数可以传 `{ wait: number }` 指定延迟撤回秒数。

```
参数：
  ...msgIdArr  any[]  消息 ID 列表，最后一个可以是 { wait: number } 配置对象

返回值：Promise<any>
```

```js
// 立即撤回当前用户发的消息
await s.delMsg(s.getMsgId());

// 5 秒后撤回
await s.delMsg(s.getMsgId(), { wait: 5 });

// 撤回机器人自己发的消息
const botMsgId = await s.reply('处理中...');
await doSomething();
await s.delMsg(botMsgId); // 处理完后撤回提示

// 批量撤回
await s.delMsg(msgId1, msgId2, msgId3);

// 发送后 3 秒自动撤回
const id = await s.reply('此消息 3 秒后消失');
await s.delMsg(id, { wait: 3 });
```

---

### 4.13 `waitInput(callback, time)`

**作用：** 挂起当前插件，等待该用户在同一对话中发送下一条消息。可用于实现多步骤交互。

```
参数：
  callback  Function  接收到用户输入时的回调（参数为 Sender）
  time      number    最长等待时间（秒），超时后返回 null

返回值：Promise<Sender | null>
  - 用户在时间内有输入：返回新的 Sender 实例
  - 超时未输入：返回 null
```

```js
// 单步输入
module.exports = async (s) => {
  await s.reply('请输入你的姓名（30秒内）：');
  const input = await s.waitInput(() => {}, 30);
  if (!input) {
    return s.reply('超时未输入，已取消');
  }
  const name = input.getMsg();
  await s.reply(`你好，${name}！`);
};

// 多步输入
module.exports = async (s) => {
  await s.reply('第一步：请输入用户名');
  const step1 = await s.waitInput(() => {}, 30);
  if (!step1) return s.reply('超时');
  const username = step1.getMsg();

  await s.reply('第二步：请输入密码');
  const step2 = await s.waitInput(() => {}, 30);
  if (!step2) return s.reply('超时');
  const password = step2.getMsg();

  await s.reply(`注册成功：${username}`);
};
```

---

### 4.14 `inlineSugar(msg)`

**作用：** 代替当前用户向框架内部发送一条消息，相当于该用户自己输入了这条命令。可用于触发其他插件命令。

```
参数：
  msg  string  要发送的消息内容

返回值：Promise<boolean>
```

```js
// 触发另一个插件的命令
await s.inlineSugar('签到');

// 组合命令
await s.inlineSugar(`查询 ${s.param(1)}`);
```

---

### 4.15 `again(replyInfo)`

通过底层适配器通道直接发送消息，绕过 `reply()` 的字符串自动转换预处理。
与 `reply()` 的区别：`reply()` 接受字符串或 replyInfo 对象并自动处理类型转换；
`again()` 只接受已构造好的 replyInfo 对象，直接透传给适配器发送。
适用于需要精确控制消息格式的场景，以及在 `waitInput` 回调中对新 Sender 发起回复时。
**普通插件开发优先使用 `reply()`，特殊格式需求或底层开发才用 `again()`。**

```
参数：
  replyInfo  replyInfo | any  完整的消息体对象（不做类型转换）

返回值：Promise<string>  发出消息的 ID
```

```js
// 发送已构造好的消息体（直接透传，不做字符串包装）
await s.again({ type: 'text', msg: '处理完毕' });

// 在 waitInput 回调中使用，向原始对话发送消息
const input = await s.waitInput(async (newSender) => {
  // newSender.reply() 回复的是新收到的那条消息
  // s.again() 回复的是原始触发消息的对话上下文
  await s.again({ type: 'text', msg: `你输入了：${newSender.getMsg()}` });
}, 30);

// 与 reply() 对比：
await s.reply('你好');                          // reply 自动包装字符串
await s.again({ type: 'text', msg: '你好' });  // again 需要完整 replyInfo
```

---

### 4.16 `isWaitDel(argsArr)`

框架内部辅助方法，由 `delMsg()` 自动调用，**插件开发者无需直接使用**。
功能：检查传入的参数数组中最后一个元素是否为 `{ wait: number }` 格式的延迟配置对象。
若最后一个参数是 `{ wait: N }` 对象，则将撤回操作延迟 N 秒执行并从参数中移除该配置；
否则立即执行撤回，返回原始参数数组。

```
参数：
  argsArr  any[]  delMsg 接收到的原始参数数组

返回值：Promise<any[]>  处理后的消息 ID 数组（已剔除 wait 配置对象）
```

```js
// 以下均由 delMsg 内部调用，插件中直接使用 delMsg 即可：
await s.delMsg(msgId);               // 立即撤回
await s.delMsg(msgId, { wait: 5 }); // 延迟 5 秒撤回（isWaitDel 自动处理）
```

---

## 五、BncrPluginConfig — 插件配置

用于读取用户在 Web 管理面板中填写的插件配置。

### 构造函数

```js
const ConfigDB = new BncrPluginConfig(jsonSchema)
```

```
参数：
  jsonSchema  object  通过 BncrCreateSchema 构建的 JSON Schema 对象
```

### 属性


| 属性 | 类型 | 说明 |
|------|------|------|
| `ConfigDB.userConfig` | `object` | 用户填写的配置，调用 get() 后可用 |
| `ConfigDB.jsonSchema` | `object` | 传入的 JSON Schema 原始对象 |


### 方法

#### `ConfigDB.get(key?)`

**作用：** 从数据库拉取用户配置并填充到 `userConfig`。一般在插件/模块初始化时调用一次。

```
参数：
  key  string  可选，获取特定配置键的值

返回值：Promise<any>
```

```js
const jsonSchema = BncrCreateSchema.object({ ... });
const ConfigDB = new BncrPluginConfig(jsonSchema);

// 初始化时拉取配置（模块加载时调用）
await ConfigDB.get();

// 之后可直接使用
const { host, port, password } = ConfigDB.userConfig;
```

---

## 六、BncrCreateSchema — Schema 构建工具

链式 API，用于定义插件配置的 JSON Schema，决定 Web 管理面板中显示的配置表单样式。

### 根类型


| 方法 | 说明 |
|------|------|
| `BncrCreateSchema.object(properties?)` | 创建对象类型 Schema |
| `BncrCreateSchema.string()` | 创建字符串字段 |
| `BncrCreateSchema.number()` | 创建数字字段 |
| `BncrCreateSchema.array(items)` | 创建数组字段，items 为元素类型 |


### 链式方法（所有类型通用）


| 方法 | 参数 | 说明 |
|------|------|------|
| `.setTitle(str)` | string | 设置字段在面板中显示的标题 |
| `.setDescription(str)` | string | 设置字段描述/提示文字 |
| `.setDefault(val)` | any | 设置字段默认值 |
| `.setEnum(arr)` | any[] | 限定可选值列表（下拉框） |
| `.setEnumNames(arr)` | string[] | 枚举值对应的显示名称 |


### 完整示例

```js
const jsonSchema = BncrCreateSchema.object({

  // 文本输入框
  redis_host: BncrCreateSchema.string()
    .setTitle('Redis 地址')
    .setDescription('如 127.0.0.1')
    .setDefault('127.0.0.1'),

  // 数字输入框
  redis_port: BncrCreateSchema.number()
    .setTitle('Redis 端口')
    .setDefault(6379),

  // 密码框（枚举空列表）
  redis_password: BncrCreateSchema.string()
    .setTitle('Redis 密码')
    .setDescription('没有密码留空'),

  // 下拉选择框
  redis_open: BncrCreateSchema.string()
    .setTitle('是否启用 Redis')
    .setEnum(['true', 'false'])
    .setEnumNames(['启用', '禁用'])
    .setDefault('false'),

  // 数字类型的索引
  redis_index: BncrCreateSchema.number()
    .setTitle('数据库索引')
    .setDefault(0),

  // 数组类型
  allowedUsers: BncrCreateSchema.array(BncrCreateSchema.string())
    .setTitle('白名单用户 ID 列表')
    .setDescription('每行一个用户 ID'),

}).setTitle('Redis 配置');

// 注册到插件配置系统
const ConfigDB = new BncrPluginConfig(jsonSchema);
```

---

## 七、Adapter — 适配器

用于开发自定义平台接入（如接入新的 IM 平台）。

### 构造函数

```js
const adapter = new Adapter('platformName')
```

```
参数：
  AdapterName  string  适配器/平台标识名称
```

### 方法

#### `adapter.receive(msgInfo)`

**作用：** 将从外部平台收到的消息交给框架处理（触发插件匹配）。

```
参数：
  msgInfo  msgInter  消息体对象（见类型定义章节）

返回值：Promise<void>
```

```js
// 收到外部平台消息时调用
adapter.receive({
  userId: '123456',
  userName: '张三',
  groupId: '0',
  groupName: '',
  msg: '签到',
  msgId: 'msg_abc'
});
```

#### `adapter.reply(replyInfo)`

框架调用此方法将消息发送给用户。
在自定义适配器中，你需要**重写（覆盖）**此方法，实现将 replyInfo 转换成目标平台 API 调用的逻辑。
每当插件调用 `s.reply()` 时，框架最终会调用你的适配器的 `reply()` 方法。

```
参数：
  replyInfo  replyInfo  消息体（含 type/msg/path 等字段）

返回值：Promise<string>  —  发出消息的 ID（没有则返回空字符串）
```

#### `adapter.push(replyInfo)`

主动向用户推送消息，不依赖用户触发。
当插件调用 `sysMethod.push()` 且平台匹配时，框架会调用此适配器的 `push()` 方法。
实现方式通常与 `reply()` 相同，直接委托给 `reply()` 即可。

```
参数：
  replyInfo  replyInfo  消息体

返回值：Promise<string>  —  消息 ID
```

#### `adapter.delMsg(msgIdArr)`

撤回消息。当插件调用 `s.delMsg()` 时，框架会调用此方法。
如果目标平台不支持撤回，可以留空实现（什么都不做）。

```
参数：
  msgIdArr  string[]  要撤回的消息 ID 数组

返回值：Promise<void>
```

### 完整自定义适配器示例

参考官方 ssh 适配器（`sampleFile/Adapter/ssh.js`）的写法：

```js
/**
 * @name    myPlatform
 * @author      Me
 * @description 自定义平台适配器示例，演示如何将第三方 IM 平台接入 Bncr
 * @version     1.0.0
 * @team        Me
 * @adapter true
 * @disable     false
 * @public      false
 * @classification ["适配器"]
 */
module.exports = async () => {
  // 1. 创建适配器实例，传入平台名称（用于 sysMethod.push 的 platform 字段匹配）
  const adapter = new Adapter('myPlatform');

  // 2. 连接到目标平台（如 WebSocket、轮询、SDK 初始化等）
  const client = connectToMyPlatform();

  // 3. 监听平台消息，转换格式后交给框架处理
  client.on('message', (rawMsg) => {
    adapter.receive({
      userId:    rawMsg.senderId,       // 发送者 ID（必填）
      userName:  rawMsg.senderName,     // 发送者昵称（必填，没有传空字符串）
      groupId:   rawMsg.groupId || '0', // 群组 ID（私聊传 '0'）
      groupName: rawMsg.groupName || '',// 群组名称（没有传空字符串）
      msg:       rawMsg.content,        // 消息文本内容（必填）
      msgId:     rawMsg.id,             // 消息 ID，用于撤回（没有传空字符串）
    });
  });

  // 4. 重写 reply()：将框架的消息体转换为目标平台的发送 API 调用
  adapter.reply = async function (replyInfo) {
    if (replyInfo.type === 'text') {
      const result = await client.sendText(replyInfo.userId, replyInfo.msg);
      return result.messageId || '';  // 返回发出的消息 ID
    }
    if (replyInfo.type === 'image') {
      const result = await client.sendImage(replyInfo.userId, replyInfo.path);
      return result.messageId || '';
    }
    return '';
  };

  // 5. 重写 push()：主动推送（通常直接复用 reply）
  adapter.push = function (replyInfo) {
    return this.reply(replyInfo);
  };

  // 6. 重写 delMsg()：撤回消息（如果平台不支持留空即可）
  adapter.delMsg = async function (msgIdArr) {
    for (const id of msgIdArr) {
      await client.deleteMessage(id);
    }
  };

  return adapter;
};
```

---

## 八、router — 全局路由

框架将 Express Router 实例暴露为全局 `router`，可在插件中直接注册 HTTP 接口。

### 基础用法

```js
// 注册 GET 接口
router.get('/myPlugin/data', async (req, res) => {
  const data = await db.get('myData');
  res.json({ code: 0, data });
});

// 注册 POST 接口
router.post('/myPlugin/save', async (req, res) => {
  const { key, value } = req.body;
  await db.set(key, value);
  res.json({ code: 0, msg: 'ok' });
});
```

### 扩展方法

#### `router.addBncrHandleRawBodyPath(path)`

**作用：** 声明该路由需要在 `req` 中携带原始 body（`req.bncrHandleRawBody`），用于需要验证签名的 Webhook。

```js
router.addBncrHandleRawBodyPath('/webhook/github');
router.post('/webhook/github', (req, res) => {
  const rawBody = req.bncrHandleRawBody; // Buffer 原始数据
  // 验证签名...
});
```

#### `router.deleteBncrHandleRawBodyPath(path)`

**作用：** 移除某路由的原始 body 处理。

```js
router.deleteBncrHandleRawBodyPath('/webhook/github');
```

#### `router.getAllBncrHandleRawBodyPath()`

**作用：** 获取所有已注册的原始 body 路由路径列表。

```
返回值：string[]
```

#### `router.ws(path, callback)`

**作用：** 注册 WebSocket 路由。

```js
router.ws('/myPlugin/ws', (ws) => {
  ws.on('message', (msg) => {
    ws.send(`收到：${msg}`);
  });
});
```

---

## 九、RunningInformation — 运行信息

全局对象，记录框架各模块的实时运行状态与统计数据。**只读**，不要向其写入。

### `AdapterTriggerRecord`

各平台适配器的消息收发统计，key 为适配器名称（平台标识）。

```js
const record = RunningInformation.AdapterTriggerRecord;
// 结构示例：
// {
//   'tgBot': { name: 'tgBot', receive: 100, handle: 98, intercept: 2, sending: 95 },
//   'qq':    { name: 'qq',    receive: 50,  handle: 48, intercept: 2, sending: 46 }
// }
```


| 字段 | 类型 | 说明 |
|------|------|------|
| `.name` | `string` | 适配器名称（平台标识） |
| `.receive` | `number` | 累计收到的消息总数 |
| `.handle` | `number` | 实际被插件处理的消息数（receive - intercept） |
| `.intercept` | `number` | 被系统拦截（未进入插件匹配）的消息数 |
| `.sending` | `number` | 累计发出的消息总数 |


---

### `getAdapterInfo(key)`

获取指定适配器的详细信息对象。
`key` 传入适配器名称（平台标识），如 `'tgBot'`；
传入 `'all'` 或不存在的 key 时返回所有适配器信息。

```
参数：
  key  string  适配器名称，或 'all' 获取全部

返回值：{ [adapterName: string]: object }  适配器详情对象
```

```js
// 获取单个适配器信息
const tgInfo = RunningInformation.getAdapterInfo?.('tgBot');
console.log(tgInfo);

// 获取所有适配器信息
const allAdapters = RunningInformation.getAdapterInfo?.('all');
for (const [name, info] of Object.entries(allAdapters || {})) {
  console.log(`适配器 ${name}:`, info);
}
```

---

### `getLoadingPlugInfo(key)`

获取已加载插件的详细信息。
`key` 传入插件文件路径（绝对路径）可获取单个插件；
传入 `'all'` 获取所有已加载插件的信息字典，key 为文件路径。

```
参数：
  key  string  插件文件绝对路径，或 'all' 获取全部

返回值：{ [filePath: string]: sendPluginsInfo }
```

`sendPluginsInfo` 的关键字段：


| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 插件名称（@name 注解） |
| `description` | `string` | 插件描述（@description 注解） |
| `author` | `string` | 作者（@author 注解） |
| `version` | `string` | 版本号（@version 注解） |
| `isMod` | `boolean?` | 是否为模块文件 |
| `isCron` | `boolean` | 是否为定时任务插件 |
| `isService` | `boolean` | 是否为后台服务插件 |
| `isAuthentication` | `boolean` | 是否需要付费授权 |


```js
// 获取所有已加载插件
const plugins = RunningInformation.getLoadingPlugInfo?.('all');
if (plugins) {
  for (const [filePath, info] of Object.entries(plugins)) {
    console.log(`插件: ${info.name} v${info.version} (${filePath})`);
  }
}

// 查询特定插件是否已加载
const myPlugin = RunningInformation.getLoadingPlugInfo?.(
  '/bncr/BncrData/plugins/myPlugin.js'
);
if (myPlugin) {
  console.log('插件已加载:', myPlugin['/bncr/BncrData/plugins/myPlugin.js']?.name);
}
```

---

### `BncrCache`

框架全局缓存对象，key-value 结构，可用于在不同插件或模块间共享运行时数据。
**注意：重启后缓存清空，不要用于持久化，持久化请用 `BncrDB`。**

```js
// 写入缓存
RunningInformation.BncrCache['myPlugin:lastRun'] = Date.now();

// 读取缓存
const lastRun = RunningInformation.BncrCache['myPlugin:lastRun'];
```

---

### `AllPluginConfigStorage`

所有插件配置的存储仓库，key 为插件文件绝对路径。
每个条目包含该插件的 JSON Schema 定义和用户实际填写的配置值。
一般通过 `BncrPluginConfig.get()` 读取，不建议直接操作此对象。

```js
// 查看某个插件的当前用户配置
const storage = RunningInformation.AllPluginConfigStorage;
const pluginPath = '/bncr/BncrData/plugins/myPlugin.js';
if (storage[pluginPath]) {
  console.log('用户配置:', storage[pluginPath].userConfig);
  console.log('Schema定义:', storage[pluginPath].jsonSchema);
}
```


| 字段 | 类型 | 说明 |
|------|------|------|
| `AdapterTriggerRecord` | `object` | 各平台适配器的消息收发统计 |
| `getAdapterInfo(key)` | `Function` | 获取适配器详情，传 `'all'` 返回全部 |
| `getLoadingPlugInfo(key)` | `Function` | 获取已加载插件信息，传 `'all'` 返回全部 |
| `BncrCache` | `object` | 框架运行时缓存，重启清空 |
| `AllPluginConfigStorage` | `object` | 所有插件的 Schema + 用户配置存储 |


---

## 十、DatabaseInstantiationObject — 数据库实例注册表

全局只读对象，存储所有通过 `new BncrDB(name, { registerName })` 创建并注册的数据库实例配置。
每当你用 `registerName` 选项创建 `BncrDB` 时，该实例的配置信息会自动注册到此对象，
方便在其他模块中复用同一数据库实例，避免重复创建。

```
结构：
  DatabaseInstantiationObject[registerName] = {
    registerName:      string  —  注册名
    useMiddlewarePath: string  —  使用的数据库中间件路径
    db:                object  —  数据库实例对象（可选）
  }
```

```js
// 注册一个自定义 Level 数据库
import { Level } from 'level';
import path from 'path';

const MyDB = new Level(path.join(process.cwd(), 'BncrData/db/mySharedDB'), {
  valueEncoding: 'json'
});

// 用 registerName 注册，其他模块可通过 registerName 找到此实例
const db = new BncrDB('myPlugin', {
  registerName: 'mySharedDB',
  useMiddlewarePath: 'db/Level.ts',
  db: MyDB
});

// 在另一个模块中查看是否已有注册的实例，避免重复创建
const existing = DatabaseInstantiationObject['mySharedDB'];
if (existing) {
  log.info('数据库已注册:', existing.registerName);
  log.info('使用中间件:', existing.useMiddlewarePath);
}
```

> **注意：** 无需手动修改此对象，框架会在 `new BncrDB()` 时自动维护。

---

## 十一、String 颜色扩展

框架为 `String.prototype` 注入了颜色和样式属性，可直接用于 `console.log` 终端彩色输出。

```js
console.log('成功'.green);
console.log('警告'.yellow);
console.log('错误'.red.bold);
console.log('信息'.cyan);
console.log('标题'.blue.underline);
```

### 文本颜色


| 属性 | 颜色 |
|------|------|
| `.black` | 黑色 |
| `.red` | 红色 |
| `.green` | 绿色 |
| `.yellow` | 黄色 |
| `.blue` | 蓝色 |
| `.magenta` | 洋红 |
| `.cyan` | 青色 |
| `.white` | 白色 |
| `.gray` / `.grey` | 灰色 |


### 背景颜色


| 属性 | 颜色 |
|------|------|
| `.bgBlack` | 黑色背景 |
| `.bgRed` | 红色背景 |
| `.bgGreen` | 绿色背景 |
| `.bgYellow` | 黄色背景 |
| `.bgBlue` | 蓝色背景 |
| `.bgMagenta` | 洋红背景 |
| `.bgCyan` | 青色背景 |
| `.bgWhite` | 白色背景 |


### 文本样式


| 属性 | 说明 |
|------|------|
| `.bold` | 粗体 |
| `.dim` | 暗淡 |
| `.italic` | 斜体 |
| `.underline` | 下划线 |
| `.strikethrough` | 删除线 |
| `.inverse` | 反色（前景背景互换） |
| `.hidden` | 隐藏文字 |
| `.reset` | 重置样式 |


### 特效


| 属性 | 说明 |
|------|------|
| `.rainbow` | 彩虹色 |
| `.zebra` | 斑马纹（交替颜色） |
| `.america` | 美国国旗色 |
| `.trap` | 陷阱效果 |
| `.random` | 随机颜色 |
| `.zalgo` | Zalgo 字符效果 |
| `.strip` / `.stripColors` | 清除所有颜色/样式 |


```js
// 组合使用
console.log('Error'.red.bold);
console.log('Success'.green.underline);
console.log(('[' + new Date().toISOString() + ']').gray + ' 事件触发'.yellow);
```

---

## 十二、消息体类型定义

### msgInter — 接收消息体

```typescript
interface msgInter {
  userId: string;        // 用户 ID（必填，平台内唯一）
  userName: string;      // 用户名/昵称（必填，没有时传空字符串）
  groupId: string;       // 群组 ID（必填，私聊时传 "0"）
  groupName: string;     // 群组名称（必填，没有时传空字符串）
  msg: string;           // 消息内容文本
  msgId: string;         // 消息 ID（必填，用于撤回，没有时传空字符串）
  fromType?: string;     // 平台类型标识（可选，一般由框架自动填入）
  friendId?: string;     // 好友 ID（可选，部分平台专用）
}
```

### replyInfo — 发送消息体

```typescript
// 文本消息
type replyInfo = {
  type: 'text';
  msg: string;            // 文本内容（必填）
}

// 媒体消息（图片/视频/音频）
| {
  type: 'image' | 'video' | 'audio';
  path: string;           // 文件路径或 URL（必填）
  msg?: string;           // 附加说明文字（可选）
}

// 通用形式（可指定发送目标）
| {
  type: string;
  path?: string;
  msg?: string;
  userId?: string;        // 指定目标用户 ID
  groupId?: string;       // 指定目标群组 ID
  toMsgId?: string;       // 引用回复的消息 ID
}
```

---

## 十三、插件元数据注解

在插件文件顶部用 JSDoc 注解定义插件信息，框架启动时会解析这些注解。不同类型的插件写法不同，下面分三种列出。

#### 命令插件（有 `@rule`，用户发消息触发）

```js
/**
 * @author      作者名
 * @name        插件名称
 * @team        团队名称
 * @version     1.0.0
 * @description 插件功能描述
 * @rule        ^(命令1|命令2)(.*)$
 * @rule        ^快捷命令$
 *              多条 @rule 是 OR 关系，满足任意一条即触发
 * @priority    100
 *              优先级，数字越大越先匹配（默认 0）
 * @admin       false
 *              true: 仅管理员可触发
 * @public      true
 *              是否公开到订阅源
 * @classification ["分类"]
 *              分类标签（JSON 数组，必填）
 * @disable     false
 *              true: 默认禁用（可选）
 * @parallel    true
 *              true: 并行处理，false: 串行（可选）
 * @authentication false
 *              true: 需要付费授权（可选）
 */
module.exports = async (s) => {
  // s 是 Sender 实例
};
```

#### 后台 Service 插件（无触发规则，框架启动时自动运行）

```js
/**
 * @author      作者名
 * @name        插件名称
 * @team        团队名称
 * @version     1.0.0
 * @description 插件功能描述
 * @service     true
 * @priority    100
 * @disable     false
 * @public      false
 * @classification ["分类"]
 * @authentication false
 *              可选
 * @systemVersion >=:3.0.0
 *              要求的框架最低版本（可选）
 */
module.exports = async () => {
  // 没有 s 参数，直接写后台逻辑
};
```

#### 适配器（接入新平台）

```js
/**
 * @author      作者名
 * @name        平台名称
 * @team        团队名称
 * @version     1.0.0
 * @description 适配器描述
 * @adapter     true
 * @public      false
 * @disable     false
 * @priority    0
 * @classification ["适配器分类"]
 */
module.exports = async () => {
  // 无 s 参数，返回 adapter 实例
  return adapter;
};
```

#### 模块文件（被其他插件 require 引用，不响应用户消息）

```js
/**
 * @author      作者名
 * @name        模块名称
 * @team        团队名称
 * @version     1.0.0
 * @description 模块功能描述
 * @module      true
 * @public      false
 * @disable     false
 * @classification ["工具"]
 */
// 无 module.exports = async，直接导出工具函数
module.exports = { fn1, fn2 };
```

---

## 十四、插件云认证接口

用于自建插件订阅服务端，控制哪些用户可以看到或下载插件。
文件位置：`/bncr/BncrData/config/PluginCloudAuthentication.ts`

### `getPluginsList(userInfo, pluginList)`

**作用：** 用户打开插件市场时触发，可根据请求者信息过滤插件列表。

```typescript
// userInfo: 请求方信息
// userInfo.bncrVersion  string  框架版本
// userInfo.machineId    string  机器 ID
// userInfo.isDev        string  是否开发者

// pluginList: 插件列表
// pluginList.publicList          公开插件列表
// pluginList.authenticationList  付费插件列表

export async function getPluginsList(userInfo, pluginList) {
  // 示例：只允许指定机器 ID 看到付费插件
  const allowedMachines = ['machine123', 'machine456'];
  if (!allowedMachines.includes(userInfo.machineId)) {
    pluginList.authenticationList = {};
  }
  return pluginList; // 必须返回 pluginList
}
```

### `getPluginsContent(userInfo, pluginsInfo)`

**作用：** 用户请求下载某个插件时触发，返回 `true` 允许下载，`false` 拒绝。

```typescript
export async function getPluginsContent(userInfo, pluginsInfo) {
  // 示例：只允许 dev 用户下载认证插件
  if (pluginsInfo.isAuthentication && userInfo.isDev !== 'true') {
    return false;
  }
  return true;
}
```

---

## 十五、数据库中间件底层方法

`BncrDB` 底层由 `systemDB` 类实现，一般不直接使用，但可用于高级场景。

### Nedb 中间件 (`db/Nedb.ts`)

```typescript
class systemDB {
  DB: NeDB<any>;    // NeDB 实例
  name: string;     // 表名

  constructor(name: string, diyDB?: NeDB<any>)

  // 写入/更新
  async _update(key: string, value: string): Promise<boolean>

  // 删除
  async _delDb(key: string): Promise<void>

  // 查单条（bool=true 返回原始记录含元数据）
  async _find(key: string, bool?: boolean): Promise<any>

  // 查多条（不传 key 时返回全表）
  async _finds(key?: string): Promise<any>

  // 查所有表名
  async _findAllFrom(): Promise<string[]>

  // 查当前表所有 key
  async _keys(): Promise<string[]>
}
```

### Level 中间件 (`db/Level.ts`)

```typescript
class systemDB {
  DB: Level<string, any>;  // LevelDB 实例
  name: string;

  constructor(name: string, diyDB?: Level<string, any>)

  async _update(key: string, value: string): Promise<boolean>
  async _delDb(key: string): Promise<void>
  async _find(key: string, bool?: boolean): Promise<any>
  async _findAllFrom(): Promise<string[]>
  async _keys(): Promise<string[]>
}
```

---

## 十六、完整使用示例

### 示例 1：多步骤交互命令

```js
/**
 * @author      Me
 * @name        用户注册
 * @team        Me
 * @version     1.0.0
 * @description 多步骤交互式注册命令，引导用户依次输入用户名和密码并保存
 * @rule        ^注册$
 * @priority    0
 * @admin       false
 * @public      true
 * @classification ["工具"]
 */
module.exports = async (s) => {
  const db = new BncrDB('userRegister');

  await s.reply('欢迎注册！请输入用户名（30秒内）：');
  const step1 = await s.waitInput(() => {}, 30);
  if (!step1) return s.reply('超时，注册已取消');
  const username = step1.getMsg().trim();

  await s.reply('请输入密码：');
  const step2 = await s.waitInput(() => {}, 30);
  if (!step2) return s.reply('超时，注册已取消');
  const password = step2.getMsg().trim();

  const userId = s.getUserId();
  await db.set(`user:${userId}`, { username, password, createdAt: Date.now() });

  await s.reply(`✅ 注册成功！欢迎 ${username}`);
};
```

---

### 示例 2：定时推送 + 数据库读写

```js
/**
 * @author      Me
 * @name        每日报告
 * @team        Me
 * @version     1.0.0
 * @description 后台服务插件：每天早上 8 点向管理员推送日报，每小时自动更新报告数据
 * @service     true
 * @priority    100
 * @public      false
 * @disable     false
 * @classification ["工具"]
 */
module.exports = async () => {
  const db = new BncrDB('dailyReport');

  // 每天早上 8 点发报告
  sysMethod.cron.newCron('0 0 8 * * *', async () => {
    const report = await db.get('lastReport', '暂无数据');
    await sysMethod.pushAdmin({
      platform: ['tgBot'],
      msg: `📊 每日报告\n${report}\n时间：${sysMethod.getTime('yyyy-MM-dd hh:mm:ss')}`
    });
  });

  // 每小时更新一次报告数据
  sysMethod.cron.newCron('0 0 * * * *', async () => {
    const data = `处理消息 ${Math.floor(Math.random() * 1000)} 条`;
    await db.set('lastReport', data);
    log.info('报告数据已更新:', data);
  });
};
```

---

### 示例 3：自定义 Web 接口 + 登录验证

```js
/**
 * @author      Me
 * @name        自定义API
 * @team        Me
 * @version     1.0.0
 * @description 后台服务插件：注册自定义 HTTP 接口，支持 Web 登录验证和 Webhook 接收
 * @service     true
 * @priority    100
 * @public      false
 * @disable     false
 * @classification ["工具"]
 */
module.exports = async () => {
  const db = new BncrDB('myApiData');

  // 需要登录才能访问的接口
  router.get('/myApi/getData', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ code: 401, msg: '未提供 Token' });

    const status = await sysMethod.isWebLogin(token);
    if (status !== 1) return res.status(401).json({ code: status, msg: '登录已过期' });

    const data = await db.get('apiData', []);
    res.json({ code: 0, data });
  });

  // 公开接口（无需登录）
  router.post('/myApi/webhook', async (req, res) => {
    const { event, payload } = req.body;
    log.info('收到 Webhook:', event);
    await db.set(`webhook:${Date.now()}`, payload);
    res.json({ code: 0 });
  });
};
```

---

### 示例 4：模块文件（被其他插件引用）

```js
/**
 * @author      Me
 * @name        myUtils
 * @team        Me
 * @version     1.0.0
 * @description 工具模块：提供配置读取和日志写入功能，供其他插件通过 require 引用，不直接响应用户命令
 * @module      true
 * @public      false
 * @disable     false
 * @classification ["工具"]
 */
const log = BncrJSLogger || require('log4js').getLogger('myUtils');
const db = new BncrDB('myUtils');

async function getConfig() {
  return await db.get('config', { timeout: 5000 });
}

async function saveLog(msg) {
  const key = `log:${Date.now()}`;
  await db.set(key, { msg, time: sysMethod.getTime('yyyy-MM-dd hh:mm:ss') });
  log.info('日志已保存:', msg);
}

module.exports = { getConfig, saveLog };
```

```js
// 在其他插件中引用
const myUtils = require('./mod/myUtils.js');

module.exports = async (s) => {
  const config = await myUtils.getConfig();
  await myUtils.saveLog(`用户 ${s.getUserName()} 触发了命令`);
  await s.reply(`超时设置：${config.timeout}ms`);
};
```

---

### 示例 5：watch 监听数据变更

```js
/**
 * @author      Me
 * @name        配置监听
 * @team        Me
 * @version     1.0.0
 * @description 后台服务插件：监听 config 表中 maxUsers 的变更，自动拦截超出上限的值并阻止删除
 * @service     true
 * @priority    100
 * @public      false
 * @disable     false
 * @classification ["工具"]
 */
module.exports = async () => {
  const db = new BncrDB('config');
  const log = BncrJSLogger || require('log4js').getLogger('configWatcher');

  db.watch({
    id: 'configWatcher',
    key: 'maxUsers',
    callback: (method) => {
      if (method.eventType === 'set') {
        const val = parseInt(method.newValue);
        if (val > 1000) {
          log.warn(`maxUsers 超过上限，已自动修正为 1000`);
          method.changeValue(1000);
        }
        log.info(`maxUsers 已更新为: ${method.newValue}`);
      }
      if (method.eventType === 'del') {
        log.warn('有人尝试删除 maxUsers，已阻止');
        method.stop();
      }
    }
  });
};
```
