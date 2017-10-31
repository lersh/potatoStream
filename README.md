# potatoStream
使用Nodejs实现的代理服务器，使用AES-256-GCM加密。后继计划会添加obfs混淆。

目前还在试验阶段，请谨慎使用。需要在服务器和本地安装[Node.js](https://nodejs.org/)


1. potatoServer.js是服务器。
2. potatoSocks.js是本地的socks5代理服务器。
3. 使用git clone到本地后，请先执行npm install来安装依赖组件
4. 然后新建一个config.josn文件作为配置

```
{
    "server_addr": "127.0.0.1",//服务器地址
    "server_port": 1999,//服务器的端口
    "local_port": 3000,//本地socks5代理服务器的端口
    "method": "https",//使用本地加密还是https方式加密，如果是http则模拟http方式，https的使用自签名的tls方式来加密传输
    "camouflage":"/C=CN/ST=Guangdong/...",//需要伪装的域名的证书信息
    "algorithm": "aes-256-cfb",//加密算法，暂时无用。强制使用AES-256-CM
    "password": "password"//密码，需要保持两端一致
}
```
5. 然后在服务器上运行 node potatoServer.js 如果想后台运行，执行 node potatoServer.js &
6. 本地运行 node potatoSocks5.js 即可在你指定的端口开启socks5代理
7. 浏览器里设置socks5代理服务器，就可以安心的浏览了~
---

 ### 关于camouflage的字符串，一般的构成是这样的：

`/C=国家，两个字母缩写/ST=省，全拼/L=城市，全拼/O=公司全称/OU=部门/CN=域名`

---
### 关于pipe.js
用于中转流量，常见于部分公司网络屏蔽所有国外ip，这时你可以找一台国内的服务器，用pipe.js来中转流量。pipe.js不关心具体的协议无论是http还是https，还是shadowsocks(R)，只要是tcp连接都可以中转。

- 用法

 > node pipe.js 国外服务器ip 国外服务器端口 本地端口  
 > 比如 node pipe.js 45.190.\*.\* 443 1080  
 > 这样只要连接你这台机器的1080端口，就能转发到  45.190.*.*的443端口上了