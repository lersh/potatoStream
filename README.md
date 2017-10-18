# potatoStream
使用Nodejs实现的代理服务器，使用AES-256-GCM加密。后继计划会添加obfs混淆。

目前还在试验阶段，请谨慎使用。

1. potatoServer.js是服务器。
2. potatoSocks.js是本地的socks5代理服务器。
3. 使用git clone到本地后，请先执行npm install来安装依赖组件
4. 然后新建一个config.josn文件作为配置

```
{
    "server_addr": "127.0.0.1",//服务器地址
    "server_port": 1999,//服务器的端口
    "local_port": 3000,//本地socks5代理服务器的端口
    "algorithm": "aes-256-cfb",//加密算法，暂时无用。强制使用AES-256-CM
    "password": "password"//密码，需要保持两端一致
}
```
