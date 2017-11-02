# potatoStream
使用Nodejs实现的代理服务器，使用AES-256-GCM加密。已经添加了添加obfs混淆。

目前还在试验阶段，请谨慎使用。需要在服务器和本地安装[Node.js](https://nodejs.org/)


1. potatoServer.js是服务器。
2. potatoSocks5.js是客户端，也就是本地的socks5代理服务器。
3. 使用git clone到本地后，请先执行npm install来安装依赖组件
4. 然后新建一个config.josn文件作为配置

```
{
    "server_addr": "127.0.0.1",
    "server_port": 1999,
    "local_port": 3000,
    "method": "https",
    "camouflage":"/C=CN/ST=Guangdong/...",
    "algorithm": "aes-256-cfb",
    "password": "password"
}
```
> 由于json文件不能带注释，我在这里解释下各个参数的含义  
> `server_addr`代表服务器地址，客户端需要这个参数来获 取服务器的地址  
> `server_port`代表服务器的端口，服务器端也需要这个参数来知道自己需要监听哪个端口  
> `local_port`表示客户端需要监听的端口，客户端需要这个参数来知道监听在什么端口，一般是1080  
> `method`表示用什么方法来混淆。  

***有`http`和`https`两个选项，使用`http`的话，会在服务器和客户端的通讯之间加上伪装的http的头，部分运营商（比如联通）会直接识别http头里的host信息来认为你连接的就是伪装的网址，现在默认使用aliyun的网址。使用`https`的话，会在服务器和客户端之间使用tls加密通讯，通讯的证书是自签名证书，自签名证书需要自己运行`node cert.js`来生成，生成证书需要`camouflage`参数。`https`的参数的cpu占用较小，如果你发现`http`方式占用cpu较大可以采用这个方式。***

> `camouflage`生成证书用的参数，一般的构成是这样的：

`/C=国家，两个字母缩写/ST=省，全拼/L=城市，全拼/O=公司全称/OU=部门/CN=域名`  
目前的思路是采用比较大的企业的证书来伪装，比如aliyun,腾讯云等等，脑洞比较大的话也可以试试12306的证书。  
填好这个字段后，运行`node cert.js`，就会自动生成伪装的证书（需要安装了openssl），之后就可以使用`https`的伪装方式了

> `algorithm`暂时没有用。

> `password`服务器和客户端之间通讯的密码，也是生成证书用的密码，需要服务器和客户端保持一致。


5. 配置好config.json后，就可以在服务器上运行 `node potatoServer.js` 如果想后台运行，执行 `node potatoServer.js &`
6. 本地运行 node potatoSocks5.js 即可在你指定的端口开启socks5代理
7. 浏览器里设置socks5代理服务器，就可以安心的浏览了~
---

### 关于pipe.js
用于中转流量，常见于部分公司网络屏蔽所有国外ip，这时你可以找一台国内的服务器，用pipe.js来中转流量。pipe.js不关心具体的协议无论是http还是https，还是shadowsocks(R)，只要是tcp连接都可以中转。

- 用法

 > node pipe.js 国外服务器ip 国外服务器端口 本地端口  
 > 比如 node pipe.js 45.190.\*.\* 443 1080  
 > 这样只要连接你这台机器的1080端口，就能转发到  45.190.*.*的443端口上了