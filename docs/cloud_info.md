# 云服务器安全配置指南

1. SSH：只用密钥登录，关掉密码登录；root 直连可关，用普通用户 + sudo。
2.防火墙（ufw 或云安全组）：只开放 22（或改端口）和 80/443；MySQL/PostgreSQL 端口不要对公网开放。
3.数据库：应用和库同机或同 VPC，应用连 127.0.0.1；你远程维护用 SSH 隧道 或 云厂商控制台「登录到主机」 再连本机库。
4.HTTPS：前面加 Nginx / Caddy，免费证书（Let’s Encrypt）。
5.系统更新：开 unattended-upgrades 或定期 apt upgrade（先看发行版说明）。
6.备份：云盘快照（按量，很便宜或活动送）+ 定期 mysqldump/pg_dump 下载或丢对象存储——这是你数据不丢的关键，比「会不会配防火墙」更实在。
