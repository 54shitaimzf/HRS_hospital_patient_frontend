// 运行前模式开关配置（类似 C 语言的宏配置）
// 修改 DEFAULT_SERVER_MODE 为 'mock' 或 'prod' 即可全局切换默认模式。
// 若 FORCE_SERVER_MODE = true，则每次启动都会强制覆盖之前设置的 serverMode。

export const DEFAULT_SERVER_MODE = 'mock'; // 'mock' | 'prod'
export const FORCE_SERVER_MODE = true;    // 设为 true 强制覆盖用户之前的选择

// 支持通过 URL 查询参数临时覆盖：?serverMode=mock 或 ?serverMode=prod
// 若需要在构建脚本中临时注入，也可以在打包前动态改写此文件。
