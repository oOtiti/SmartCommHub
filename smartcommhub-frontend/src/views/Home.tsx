import { useRef } from 'react';
import { Carousel, Modal, Input, Button, Form, message, Radio, List, Card, Tag, Spin, Select, Typography } from 'antd';
const { Title } = Typography;
import 'antd/dist/reset.css';
import icon from '../assets/icon.png';
import photo1 from '../assets/Photo/1.jpg';
import photo2 from '../assets/Photo/2.webp';
import photo3 from '../assets/Photo/3.png';
import photo4 from '../assets/Photo/大图片.png';
import wechat from '../assets/Photo/微信.jpg';
import photo5 from '../assets/Photo/智慧社区.jpg';
import '../assets/iconfont/iconfont.css';
import '../styles/home-aside.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userAvatar from '../assets/Photo/cat.jpg';
import { useAuthStore } from '../store/auth';
import { api } from '../api/client';

// 【全局统一 无混乱】固定角色数字定义 - 写死无歧义
const ROLE_ADMIN = 0; // 管理员 → 个人中心 + 商户中心
const ROLE_ELDER = 1; // 老人 → 仅个人中心
const ROLE_FAMILY = 2; // 家属 → 仅个人中心
const ROLE_MERCHANT = 3; // 运营商 → 仅商户中心

interface Notice {
  notice_id: number;
  community_id: string;
  title: string;
  content: string;
  publish_time: string;
  target_group: string;
}

const Nav = ({ onScrollToNotices }: { onScrollToNotices: () => void }) => {
  const [showHeader, setShowHeader] = useState(true);
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setShowHeader(scrollTop <= 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return (
    <nav
      className={`w-full bg-[#EBF5FF] pt-[5px] transition-all duration-300 ${showHeader ? 'hidden' : 'fixed h-[50px] z-20 top-0 shadow-md'}`}
    >
      <div className="wrapper w-[60%] h-[50px] flex m-auto items-center">
        <ul className="flex leading-[50px] font-semibold justify-evenly text-[17px]">
          <li className="w-[100px] h-[50px] text-center">
            <a href="#" className="leading-[50px]" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              首页
            </a>
          </li>
          <li className="w-[100px] h-[50px] text-center">
            <a href="#" className="leading-[50px]">
              个人主页
            </a>
          </li>
          <li className="w-[100px] h-[50px] text-center">
            <a href="#" className="leading-[50px]" onClick={(e) => { e.preventDefault(); onScrollToNotices(); }}>
              新闻资讯
            </a>
          </li>
          <li className="w-[100px] h-[50px] text-center">
            <a href="#" className="leading-[50px]">
              医生团队
            </a>
          </li>
          <li className="w-[100px] h-[50px] text-center">
            <a href="#" className="leading-[50px]">
              便民服务
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

const Home = () => {
  const [show, setshow] = useState(false);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const profile = useAuthStore((s) => s.profile);
  const setTokens = useAuthStore((s) => s.setTokens);
  const loginApi = useAuthStore((s) => s.login);
  const registerApi = useAuthStore((s) => s.register);
  const logoutApi = useAuthStore((s) => s.logout);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [forgotForm] = Form.useForm();
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  // ✅ 核心修复：获取当前用户角色 - 统一使用数字类型
  const getUserRole = () => {
    if (!profile || profile.user_type === undefined || profile.user_type === null) return null;
    return Number(profile.user_type);
  };

  // 公告相关状态
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const noticesRef = useRef<HTMLDivElement>(null);
  const [targetGroupFilter, setTargetGroupFilter] = useState<string>('全部'); // 新增：公告筛选状态

  const scrollToNotices = () => {
    noticesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 获取公告列表
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        setNoticesLoading(true);
        let targetGroup = targetGroupFilter; // 使用筛选器的值
        
        // 如果筛选器是"全部"，则根据角色智能默认，或者确实请求"全部"
        // 这里逻辑改为：默认显示"全部"，但如果用户选择了特定群体，就显示特定的
        // 但是后端API如果不传target_group会报错吗？后端Query(...)是必填
        
        // 自动切换逻辑：如果是初次加载(或重置)，可以根据角色预设
        // 但这里我们简单处理：用户手动选择优先。
        // 为了方便，我们在组件挂载时，根据角色设置一次 targetGroupFilter
        
        const response = await api.get('/notices/', {
          params: {
            target_group: targetGroup,
            offset: 0,
            limit: 5,
          },
        });
        setNotices(response.data.items || []);
      } catch (err) {
        console.error('获取公告失败', err);
      } finally {
        setNoticesLoading(false);
      }
    };
    fetchNotices();
  }, [profile, targetGroupFilter]); // 依赖 targetGroupFilter

  // 初始化根据角色设置默认筛选
  useEffect(() => {
    const role = getUserRole();
    if (role === ROLE_ELDER) setTargetGroupFilter('老人');
    else if (role === ROLE_FAMILY) setTargetGroupFilter('家属');
    else if (role === ROLE_MERCHANT) setTargetGroupFilter('服务商');
    else setTargetGroupFilter('全部');
  }, [profile]);

  // ✅ 修复1：初始化拉取用户信息 + 加容错，就算token失效也不会卡死，保证有默认值
  useEffect(() => {
    const initAuth = async () => {
      const access = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');
      if (access && refresh) {
        setTokens(access, refresh);
        try {
          await fetchProfile(); // 强制拉取用户信息
        } catch (err) {
          // 容错：token失效就清空所有缓存，不会残留脏数据
          localStorage.clear();
        }
      }
    };
    initAuth();
  }, [setTokens, fetchProfile]);

  // ✅ 修复2：点击外部关闭菜单 - 原逻辑保留
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menuContainer = document.getElementById('user-menu-container');
      const target = e.target as Node | null;
      if (menuContainer && target && !menuContainer.contains(target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ✅ 修复3：登录逻辑 加【强制等待获取用户信息完成】+ 容错，解决登录后数据没拿到的问题
  const handleLogin = async () => {
    try {
      const values = await loginForm.validateFields();
      // 用户名前缀校验
      const { username, userType } = values;
      
      // 根据选择的身份进行简单的校验提示（可选，主要为了提升用户体验）
      if (userType === 0 && !username.toLowerCase().includes('admin')) {
        message.warning('提示：管理员账号通常包含 "admin" 前缀');
      } else if (userType === 3 && !username.toLowerCase().includes('provider')) {
        message.warning('提示：运营商账号通常包含 "provider" 前缀');
      } else if (userType === 1 && !username.toLowerCase().includes('elderly')) {
        message.warning('提示：老人账号通常包含 "elderly" 前缀');
      } else if (userType === 2 && !username.toLowerCase().includes('family')) {
        message.warning('提示：家属账号通常包含 "family" 前缀');
      }

      // 登录请求
      const ok = await loginApi(username, values.password);
      if (ok) {
        // ✅ 关键修复：必须等【用户信息拉取完成】再关闭弹窗，否则数据为空
        await fetchProfile();
        message.success('登录成功');
        setShowAuthModal(false);
        loginForm.resetFields();
      } else {
        message.error('登录失败，请检查账号密码！');
      }
    } catch (err) {
      message.error('登录失败，请检查账号密码！');
    }
  };

  // 注册逻辑 - 原逻辑保留 无修改
  const handleRegister = async () => {
    try {
      const values = await registerForm.validateFields();
      if (!values.username || !values.password || !values.confirmPwd) return;
      if (values.password !== values.confirmPwd) {
        message.error('两次密码不一致');
        return;
      }
      
      const ok = await registerApi(values.username, values.password, values.userType, values.phone);
      if (ok) {
        message.success('注册成功！自动登录中...');
        const loginOk = await loginApi(values.username, values.password);
        if (loginOk) {
          await fetchProfile();
          setIsLogin(true);
          setShowAuthModal(false);
          registerForm.resetFields();
        }
      } else {
        message.error('注册失败：用户名或手机号可能已存在');
      }
    } catch {
      message.error('注册失败，请检查信息！');
    }
  };

  // ✅ 修复4：退出登录 清空所有缓存，避免残留数据导致下次登录异常
  const handleLogout = () => {
    logoutApi();
    localStorage.clear(); // 清空所有，最彻底
    message.success('退出登录成功！');
    navigate('/');
    setShowMenu(false);
  };

  const currentRole = getUserRole();

  return (
    <div className="Home relative">
      <header className="w-full bg-[#1E90FF]">
        <div className="wrapper flex w-[85%] h-[60px] m-auto items-center">
          <div className="logo mr-[30px]">
            <a href="javascript:;" onClick={() => navigate('/')} className="flex">
              <img src={icon} alt="LOGO" className="h-[60px] w-auto mt-[15px]" />
              <h1 className="w-[245px] font-extrabold text-2xl h-[60px] leading-[60px] text-white mt-[15px]">
                智慧社区服务中心
              </h1>
            </a>
          </div>
          <ul className="flex w-[500px] h-[60px] leading-[60px] font-semibold justify-evenly items-center mt-[20px]">
            <li>
              <a href="#">解决方案</a>
            </li>
            <li>
              <a href="#">社区近况</a>
            </li>
            <li>
              <a href="#">运营商招揽</a>
            </li>
            <li>
              <a href="#">志愿者中心</a>
            </li>
          </ul>
          <div className="search w-auto h-[60px] flex items-center ml-auto">
            <a href="#" className="flex items-center mr-[20px]">
              <span className="iconfont icon-hezuohuoban inline-block text-2xl mr-[15px] font-semibold"></span>
              <span className="font-semibold leading-[60px]">获取服务</span>
            </a>
            <a href="#" className="mr-[40px]">
              <span className="inline-block iconfont icon-sousuo text-[20px] font-semibold"></span>
            </a>
            {!isLoggedIn ? (
              <a
                href="javascript:;"
                className="text-[20px] flex items-center font-medium cursor-pointer text-white"
                onClick={() => setShowAuthModal(true)}
              >
                登录
                <span className="inline-block iconfont icon-yonghuguanli text-[25px] ml-[10px]"></span>
              </a>
            ) : (
              <div className="relative cursor-pointer" id="user-menu-container">
                <div
                  className="flex items-center p-2 rounded-md hover:bg-[#007FFF]/20 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                >
                  <img
                    src={userAvatar}
                    alt="用户头像"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      marginRight: '8px',
                      border: '2px solid #fff',
                    }}
                  />
                  <span className="text-[16px] font-medium text-white">
                    {profile?.username || '用户'}
                  </span>
                </div>
                {/* ✅ ✅ ✅ 终极修复：下拉菜单【100%显示】+ 精准角色判断，无任何空白情况 */}
                <div
                  className={`absolute right-0 top-full mt-2 w-[150px] bg-white rounded-md shadow-lg py-2 z-9999 ${showMenu ? 'block' : 'hidden'}`}
                  style={{ border: '1px solid #e8e8e8' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 👉 管理员 0 → 显示【个人中心 + 商户中心】- 核心需求 */}
                  {currentRole === ROLE_ADMIN && (
                    <>
                      <div
                        className="px-4 py-2 hover:bg-[#f5f5f5] cursor-pointer"
                        onClick={() => {
                          navigate('/Profile');
                          setShowMenu(false);
                        }}
                      >
                        <span style={{ color: '#333' }}>个人中心</span>
                      </div>
                      <div
                        className="px-4 py-2 hover:bg-[#f5f5f5] cursor-pointer"
                        onClick={() => {
                          navigate('/MerchantServer');
                          setShowMenu(false);
                        }}
                      >
                        <span style={{ color: '#333' }}>商户中心</span>
                      </div>
                    </>
                  )}
                  {/* 👉 运营商 3 → 仅显示【商户中心】 */}
                  {currentRole === ROLE_MERCHANT && (
                    <div
                      className="px-4 py-2 hover:bg-[#f5f5f5] cursor-pointer"
                      onClick={() => {
                        navigate('/MerchantServer');
                        setShowMenu(false);
                      }}
                    >
                      <span style={{ color: '#333' }}>商户中心</span>
                    </div>
                  )}
                  {/* 👉 老人 1 / 家属 2 → 仅显示【个人中心】 */}
                  {(currentRole === ROLE_ELDER || currentRole === ROLE_FAMILY) && (
                    <div
                      className="px-4 py-2 hover:bg-[#f5f5f5] cursor-pointer"
                      onClick={() => {
                        navigate('/Profile');
                        setShowMenu(false);
                      }}
                    >
                      <span style={{ color: '#333' }}>个人中心</span>
                    </div>
                  )}
                  {/* ✅ 兜底：就算角色为空/异常，也显示【个人中心】，绝对不会空白！ */}
                  {!currentRole && (
                    <div
                      className="px-4 py-2 hover:bg-[#f5f5f5] cursor-pointer"
                      onClick={() => {
                        navigate('/Profile');
                        setShowMenu(false);
                      }}
                    >
                      <span style={{ color: '#333' }}>个人中心</span>
                    </div>
                  )}
                  {/* 退出登录 - 所有角色都显示 */}
                  <div
                    className="px-4 py-2 hover:bg-[#f5f5f5] cursor-pointer border-t border-[#e8e8e8] mt-1"
                    onClick={handleLogout}
                  >
                    <span style={{ color: '#333' }}>退出登录</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 登录/注册/找回密码弹窗 - 原代码 无任何修改 */}
      <Modal
        title={isForgot ? '找回密码' : isLogin ? '用户登录' : '用户注册'}
        open={showAuthModal}
        onCancel={() => {
          setShowAuthModal(false);
          loginForm.resetFields();
          registerForm.resetFields();
          forgotForm.resetFields();
          setIsLogin(true);
          setIsForgot(false);
        }}
        footer={null}
        width={400}
        centered
      >
        {isLogin && !isForgot && (
          <Form form={loginForm} layout="vertical" onFinish={handleLogin}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
            <Form.Item
              name="userType"
              label="登录类型"
              initialValue={1}
              rules={[{ required: true, message: '请选择登录类型' }]}
            >
              <Radio.Group className="flex flex-wrap gap-2">
                <Radio value={0}>管理员</Radio>
                <Radio value={1}>老人</Radio>
                <Radio value={2}>家属</Radio>
                <Radio value={3}>运营商</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" className="w-full bg-[#1E90FF]">
                登录
              </Button>
            </Form.Item>
            <div className="text-center text-gray-600 mt-2">
              还没有账号？
              <span className="text-[#1E90FF] cursor-pointer" onClick={() => setIsLogin(false)}>
                立即注册
              </span>
            </div>
            <div className="text-center text-gray-600 mt-2">
              忘记密码？
              <span
                className="text-[#1E90FF] cursor-pointer"
                onClick={() => {
                  setIsForgot(true);
                  setIsLogin(false);
                }}
              >
                找回密码
              </span>
            </div>
          </Form>
        )}
        {!isLogin && !isForgot && (
          <Form form={registerForm} layout="vertical" onFinish={handleRegister}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 4, message: '用户名至少4个字符' },
              ]}
            >
              <Input placeholder="请设置用户名" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password placeholder="请设置密码" />
            </Form.Item>
            <Form.Item
              name="confirmPwd"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次输入的密码不一致！'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="请再次输入密码" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="手机号"
              rules={[{ required: true, message: '请输入手机号' }]}
            >
              <Input placeholder="请输入绑定手机号" />
            </Form.Item>
            <Form.Item
              name="userType"
              label="注册身份"
              initialValue={1}
              rules={[{ required: true, message: '请选择注册身份' }]}
            >
              <Radio.Group>
                <Radio value={1}>老人</Radio>
                <Radio value={2}>家属</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" className="w-full bg-[#1E90FF]">
                注册
              </Button>
            </Form.Item>
            <div className="text-center text-gray-600 mt-2">
              已有账号？
              <span className="text-[#1E90FF] cursor-pointer" onClick={() => setIsLogin(true)}>
                立即登录
              </span>
            </div>
          </Form>
        )}
        {isForgot && (
          <Form
            form={forgotForm}
            layout="vertical"
            onFinish={async () => {
              try {
                const v = await forgotForm.validateFields();
                if (!v.phone || !v.newPwd || !v.confirmPwd) return;
                if (v.newPwd !== v.confirmPwd) {
                  message.error('两次密码不一致');
                  return;
                }
                await api.post('/api/auth/forgot/reset', {
                  phone: v.phone,
                  code: v.code || '000000',
                  new_password: v.newPwd,
                });
                message.success('密码已重置，请使用新密码登录');
                setIsForgot(false);
                setIsLogin(true);
                forgotForm.resetFields();
              } catch (e) {
                let errorMsg = '重置失败，请稍后再试';
                if (typeof e === 'object' && e !== null && 'response' in e) {
                  const response = (e as { response?: { data?: { detail?: string } } }).response;
                  if (response?.data?.detail) errorMsg = response.data.detail;
                }
                message.error(errorMsg);
              }
            }}
          >
            <Form.Item
              name="phone"
              label="手机号"
              rules={[{ required: true, message: '请输入手机号' }]}
            >
              <Input placeholder="请输入绑定的手机号" />
            </Form.Item>
            <Form.Item name="code" label="验证码（演示环境任意值通过）">
              <Input placeholder="请输入验证码" />
            </Form.Item>
            <Form.Item
              name="newPwd"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '至少6位' },
              ]}
            >
              <Input.Password placeholder="请设置新密码" />
            </Form.Item>
            <Form.Item
              name="confirmPwd"
              label="确认新密码"
              dependencies={['newPwd']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPwd') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次输入的密码不一致！'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="请再次输入新密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" className="w-full bg-[#1E90FF]">
                重置密码
              </Button>
            </Form.Item>
            <div className="text-center text-gray-600 mt-2">
              记起密码了？
              <span
                className="text-[#1E90FF] cursor-pointer"
                onClick={() => {
                  setIsForgot(false);
                  setIsLogin(true);
                }}
              >
                返回登录
              </span>
            </div>
          </Form>
        )}
      </Modal>

      {/* 原页面所有内容 - 无任何修改 */}
      <Nav onScrollToNotices={scrollToNotices} />
      <aside className="fixed right-12% bottom-10% border-[5px] border-dotted border-blue">
        <div className="box h-[500px] w-[70px] border-2px-solid">
          <ul className="">
            <li className="fix w-[70px] hover:bg-gray">
              <a
                href="https://github.com/oOtiti/SmartCommHub"
                className="flex flex-col items-center"
              >
                <span className="iconfont icon-github inline-block h-[50px] text-center text-4xl!"></span>
                关注我们
              </a>
            </li>
            <li
              className="fix w-[70px] hover:bg-gray relative"
              onMouseEnter={() => setshow(true)}
              onMouseLeave={() => setshow(false)}
            >
              <a href="#" className="flex flex-col items-center">
                <span className="iconfont icon-weixin1 inline-block h-[50px] text-center text-4xl!"></span>
                联系我们
              </a>
              {show && (
                <div className="absolute translate-x-20 top-0 w-[150px] z-10 ">
                  <img src={wechat} alt="微信联系二维码" className="w-full h-full object-cover" />
                  <div className="bg-[#F2F0EB] p-2 text-center text-[#4A4640] text-sm w-[150px] font-500">
                    扫码添加微信，获取专属服务
                  </div>
                </div>
              )}
            </li>
            <li className="mb-[10px] w-[70px] hover:bg-gray">
              <a href="#" className="flex flex-col items-center">
                <span className="iconfont icon-jiaoseguanli inline-block h-[50px] text-center text-4xl!"></span>
                报告查询
              </a>
            </li>
            <li className="mb-[10px] w-[70px] hover:bg-gray">
              <a href="#" className="flex flex-col items-center">
                <span className="iconfont icon-yonghuguanli1 inline-block h-[50px] text-center text-4xl!"></span>
                人工客服
              </a>
            </li>
            <li className="mb-[10px] w-[70px] hover:bg-gray">
              <a href="#" className="flex flex-col items-center">
                <span className="iconfont icon-qudenglu inline-block h-[50px] text-center text-4xl!"></span>
                就诊预约
              </a>
            </li>
            <li className="mb-[10px] w-[70px] hover:bg-gray">
              <a href="#" className="flex flex-col items-center">
                <span className="iconfont icon-xiangshang inline-block h-[50px] text-center text-3xl!"></span>
                回到顶部
              </a>
            </li>
          </ul>
        </div>
      </aside>
      <main className="body w-full bg-[#FFFFFF]">
        <div className="wrapper w-[60%] m-auto">
          <Carousel autoplay infinite draggable arrows className="h-[500px] mt-[5px]">
            <div className="photo h-[500px]">
              <img src={photo1} alt="社区图片" className="w-full h-[500px] object-cover" />
            </div>
            <div className="photo h-[500px]">
              <img src={photo2} alt="社区图片" className="w-full h-[500px] object-cover" />
            </div>
            <div className="photo h-[500px]">
              <img src={photo3} alt="社区图片" className="w-full h-[500px] object-cover" />
            </div>
          </Carousel>

          <div ref={noticesRef} style={{ marginTop: 24 }}>
            <Spin spinning={noticesLoading}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ margin: 0 }}>社区公告</Title>
                <Select
                  defaultValue="全部"
                  value={targetGroupFilter}
                  onChange={(value) => setTargetGroupFilter(value)}
                  style={{ width: 120 }}
                  options={[
                    { value: '全部', label: '全部' },
                    { value: '老人', label: '老人' },
                    { value: '家属', label: '家属' },
                    { value: '服务商', label: '服务商' },
                  ]}
                />
              </div>
              <List
                grid={{ gutter: 16, column: 1 }}
                dataSource={notices}
                renderItem={(item) => (
                  <List.Item>
                    <Card title={item.title} extra={<Tag color="blue">{item.target_group}</Tag>} size="small" hoverable>
                      <Typography.Paragraph ellipsis={{ rows: 2 }}>{item.content}</Typography.Paragraph>
                      <div style={{ textAlign: 'right', color: '#999', fontSize: '12px' }}>{item.publish_time}</div>
                    </Card>
                  </List.Item>
                )}
              />
            </Spin>
          </div>
        </div>
        <div className="h-[600px]">
          <article
            className="h-full mt-[100px] bg-no-repeat bg-cover bg-center px-8 py-12"
            style={{ backgroundImage: `url(${photo5})`, backgroundBlendMode: 'overlay' }}
          >
            <div className="max-w-4xl mx-auto mb-10">
              <h2 className="font-semibold text-3xl text-[#4167B1] text-center mb-6 pb-2 border-b-2 border-[#4167B1]/30">
                系统功能
              </h2>
              <div className="w-full bg-[#EBF5FF]/90 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                <section className="text-gray-700 leading-7 text-lg">
                  智慧社区服务中心系统是为社区老年群体打造的综合服务支撑平台，打通居家养老、社区照料、健康管理等资源，让老人不出社区就能对接各类所需服务。
                </section>
              </div>
            </div>
            <div className="max-w-4xl mx-auto">
              <h2 className="font-semibold text-3xl text-[#4167B1] text-center mb-6 pb-2 border-b-2 border-[#4167B1]/30">
                核心优点
              </h2>
              <div className="w-full bg-[#EBF5FF]/90 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                <section className="text-gray-700 leading-7 text-lg">
                  系统采用适老化+精准化设计，大字体、语音交互适配老人使用习惯，同时根据老人健康状况智能匹配服务，减轻家属照护顾虑。
                </section>
              </div>
            </div>
          </article>
        </div>
        <div className="wrapper w-[60%] m-auto">
          <h2 className="font-semibold text-4xl text-center mt-[100px] text-[#4167B1]">场景运用</h2>
          <div className="display flex justify-center items-center h-[300px]">
            <a href="#">
              <img src={photo4} alt="展示图片" className="h-[300px] object-cover" />
            </a>
          </div>
          <h2 className="font-semibold text-4xl text-center mt-[100px] text-[#4167B1]">平台特点</h2>
          <div className="h-[500px] w-full">
            <ul className="flex justify-evenly mt-[20px]">
              <li className="w-[210px]">
                <h3 className="font-semibold leading-[50px]">
                  <span className="iconfont icon-chakan text-2xl leading-[50px] inline-block h-[50px] mr-[4px]"></span>
                  安消适老物联
                </h3>
                <p>整合消防安防与老人紧急呼叫设备，全时监测状态。</p>
              </li>
              <li className="w-[210px]">
                <h3 className="font-semibold leading-[50px]">
                  <span className="iconfont icon-chakan text-2xl leading-[50px] inline-block h-[50px] mr-[4px]"></span>
                  智能预警
                </h3>
                <p>紧急情况3秒推送，分级预警提升响应效率。</p>
              </li>
              <li className="w-[210px]">
                <h3 className="font-semibold leading-[50px]">
                  <span className="iconfont icon-chakan text-2xl leading-[50px] inline-block h-[50px] mr-[4px]"></span>
                  数据联网
                </h3>
                <p>同步数据至街道/卫生站，打通养老资源。</p>
              </li>
              <li className="w-[210px]">
                <h3 className="font-semibold leading-[50px]">
                  <span className="iconfont icon-chakan text-2xl leading-[50px] inline-block h-[50px] mr-[4px]"></span>
                  适老应用
                </h3>
                <p>分角色适配，大字版一键服务更贴心。</p>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <footer className="h-[240px] bg-[#EBF5FF]">
        <div className="wrapper w-[80%] m-auto pt-[20px]">
          <div className="friendhelpboard font-extrabold text-3xl w-full h-[50px] text-center">
            友情链接
          </div>
          <ul className="w-full h-[40px] flex items-center justify-center mt-[25px] font-semibold">
            <li className="mr-[40px]">
              <a href="https://github.com/oOtiti/SmartCommHub">项目主页</a>
            </li>
            <li className="mr-[40px]">
              <a href="#">技术栈</a>
            </li>
            <li className="mr-[40px]">
              <a href="https://github.com/oOtiti/SmartCommHub">WIKI</a>
            </li>
            <li>
              <a href="#">支持我们</a>
            </li>
          </ul>
          <div className="project">
            <ul className="flex justify-center items-center">
              <li>
                <a href="https://developer.mozilla.org/zh-CN/docs/Web/HTML" className="mr-[20px]">
                  <span className="iconfont icon-html text-3xl! text-orangecolor-600"></span>
                </a>
              </li>
              <li>
                <a href="https://zh-hans.react.dev/" className="mr-[20px]">
                  <span className="iconfont icon-react text-3xl! text-blue-600"></span>
                </a>
              </li>
              <li>
                <a href="https://vitejs.cn/vite3-cn/guide/" className="mr-[20px]">
                  <span className="iconfont icon-vite text-3xl! text-purple-600"></span>
                </a>
              </li>
              <li>
                <a href="https://www.python.org/" className="mr-[20px]">
                  <span className="iconfont icon-python text-3xl! text-blue-600"></span>
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="PropertyRightsStatement w-full flex justify-center items-end h-[50px]">
          <p className="h-[50px] leading-[50px] text-sm text-[#777777]">
            ©2025暨南大学本科课程设计 --开源设计--
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
