import icon from '../assets/icon.png';
import { Carousel, Modal, Input, Button, Form, message, Radio } from 'antd';
import 'antd/dist/reset.css';
import photo1 from '../assets/Photo/1.jpg';
import photo2 from '../assets/Photo/2.webp';
import photo3 from '../assets/Photo/3.png';
import photo4 from '../assets/Photo/大图片.png';
import wechat from '../assets/Photo/微信.jpg';
import photo5 from '../assets/Photo/智慧社区.jpg';
import '../assets/iconfont/iconfont.json';
import '../styles/home-aside.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userAvatar from '../assets/Photo/cat.jpg';
// ========== 新增：引入 Axios ==========
import axios from 'axios';

// ========== 新增：配置 Axios 基础地址（对接后端 0.0.0.0:8000） ==========
const api = axios.create({
  baseURL: 'http://localhost:8000', // 0.0.0.0:8000 可通过 localhost:8000 访问
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 允许跨域携带 cookies（如果后端需要）
});

const Nav = () => {
  // 导航组件代码不变...
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
            <a href="#" className="leading-[50px]">
              首页
            </a>
          </li>
          <li className="w-[100px] h-[50px] text-center">
            <a href="#" className="leading-[50px]">
              个人主页
            </a>
          </li>
          <li className="w-[100px] h-[50px] text-center">
            <a href="#" className="leading-[50px]">
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState({
    username: '',
    userType: 'user',
    accessToken: '', // 新增：存储 access_token
    refreshToken: '', // 新增：存储 refresh_token
    expiresIn: 0, // 新增：存储过期时间
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [forgotForm] = Form.useForm();
  const [showMenu, setShowMenu] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false); // 新增：登录加载状态
  const navigate = useNavigate();

  // 页面加载时读取登录状态（修改：增加 Token 读取）
  useEffect(() => {
    const savedIsLoggedIn = localStorage.getItem('isLoggedIn');
    const savedUserInfo = localStorage.getItem('userInfo');
    if (savedIsLoggedIn === 'true' && savedUserInfo) {
      const parsedUserInfo = JSON.parse(savedUserInfo);
      setIsLoggedIn(true);
      setUserInfo({
        username: parsedUserInfo.username,
        userType: parsedUserInfo.userType,
        accessToken: parsedUserInfo.accessToken || '',
        refreshToken: parsedUserInfo.refreshToken || '',
        expiresIn: parsedUserInfo.expiresIn || 0,
      });
    }
  }, [setTokens]);

  // 点击外部关闭菜单（代码不变）
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menuContainer = document.getElementById('user-menu-container');
      const target = e.target as Node | null;
      if (menuContainer && target && !menuContainer.contains(target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // ========== 核心修改：替换为真实后端登录请求 ==========
  const handleLogin = async () => {
    setLoginLoading(true); // 开启加载状态
    try {
      // 1. 验证表单字段
      const values = await loginForm.validateFields();
      const { username, password, userType } = values;

      // 2. 发送 POST 请求到后端登录接口
      const response = await api.post('/api/auth/login', {
        username: username.trim(),
        password: password.trim(),
      });

      // 3. 处理后端响应（获取 Token 等信息）
      const { access_token, refresh_token, token_type, expires_in } = response.data;
      // 4. 存储登录状态、用户信息和 Token 到本地
      const loginUserInfo = {
        username,
        userType,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenType: token_type,
        expiresIn: expires_in,
      };

      setIsLoggedIn(true);
      setUserInfo(loginUserInfo);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userInfo', JSON.stringify(loginUserInfo));

      // 5. 提示成功并关闭模态框
      message.success(`登录成功！欢迎${userType === 'user' ? '普通用户' : '运营商'}`);
      setShowAuthModal(false);
      loginForm.resetFields();
    } catch (error) {
      // 6. 错误处理（区分表单验证错误和接口请求错误）
      if (error.name === 'ValidateError') {
        message.error('请完善登录表单信息！');
      } else if (axios.isAxiosError(error)) {
        // 接口请求错误（网络错误、用户名密码错误等）
        if (error.response) {
          // 后端返回错误状态码（如 401 用户名密码错误）
          message.error(error.response.data?.detail || '登录失败：用户名或密码错误！');
        } else {
          // 网络错误（如后端未启动、地址错误）
          message.error('登录失败：无法连接后端服务，请检查后端是否运行！');
        }
      } else {
        message.error('登录失败：未知错误！');
      }
    } finally {
      setLoginLoading(false); // 关闭加载状态
    }
  };

  // 注册逻辑（代码不变，如需对接后端注册接口可后续修改）
  const handleRegister = async () => {
    try {
      const values = await registerForm.validateFields();
      if (!values.username || !values.password || !values.confirmPwd) return;
      if (values.password !== values.confirmPwd) {
        message.error('两次密码不一致');
        return;
      }
      const isMerchant = values.userType === 'merchant';
      if (isMerchant) {
        message.info('服务商账号需由管理员创建，请联系管理员');
        return;
      }
      const ok = await registerApi(values.username, values.password, 2, values.phone);
      if (ok) {
        message.success('注册成功！请登录');
        setIsLogin(true);
        registerForm.resetFields();
      } else {
        message.error('注册失败：用户名或手机号可能已存在');
      }
    } catch (error) {
      message.error('注册失败，请检查信息！');
    }
  };

  // 退出登录逻辑（修改：清除 Token 存储）
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserInfo({
      username: '',
      userType: 'user',
      accessToken: '',
      refreshToken: '',
      expiresIn: 0,
    });
    message.success('退出登录成功！');
    navigate('/');
    setShowMenu(false);
    // 清除所有存储的登录相关信息
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userInfo');
  };

  // 其余渲染代码完全不变，直接保留
  return (
    <div className="Home relative">
      <header className="w-full bg-[#1E90FF]">
        <div className="wrapper flex w-[80%] h-[60px] m-auto items-center">
          <div className="logo mr-[30px]">
            <a
              href="javascript:;"
              onClick={() => {
                navigate('/');
              }}
              className="flex"
            >
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
            <a href="#" className="flex items-center mr-[40px]">
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
                <div
                  className={`absolute right-0 top-full mt-2 w-[150px] bg-white rounded-md shadow-lg py-2 z-9999 ${showMenu ? 'block' : 'hidden'}`}
                  style={{ border: '1px solid #e8e8e8' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="px-4 py-2 hover:bg-[#f5f5f5] cursor-pointer"
                    onClick={() => {
                      const isProvider = profile?.user_type === 'provider';
                      const targetPath = isProvider ? '/MerchantServer' : '/Profile';
                      navigate(targetPath);
                      setShowMenu(false);
                    }}
                  >
                    <span style={{ color: '#333' }}>
                      {profile?.user_type === 'provider' ? '商户中心' : '个人中心'}
                    </span>
                  </div>
                  <div
                    className="px-4 py-2 hover:bg-[#f5f5f5] cursor-pointer"
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
              rules={[{ required: true, message: '请选择登录类型' }]}
            >
              <Radio.Group>
                <Radio value="user">普通用户</Radio>
                <Radio value="merchant">运营商</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full bg-[#1E90FF]"
                loading={loginLoading} // 新增：加载状态
              >
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
        {!isLogin && (
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
              name="userType"
              label="注册类型"
              rules={[{ required: true, message: '请选择注册类型' }]}
            >
              <Radio.Group>
                <Radio value="user">普通用户</Radio>
                <Radio value="merchant">运营商</Radio>
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
                // 演示版：验证码任意值视为通过
                await api.post('/auth/forgot/reset', {
                  phone: v.phone,
                  code: v.code || '000000',
                  new_password: v.newPwd,
                });
                message.success('密码已重置，请使用新密码登录');
                setIsForgot(false);
                setIsLogin(true);
                forgotForm.resetFields();
              } catch (e: any) {
                const msg = e?.response?.data?.detail || '重置失败，请稍后再试';
                message.error(msg);
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
      <Nav />
      <aside className="fixed right-12% bottom-25% border-[5px] border-dotted border-blue">
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
                  <span className="iconfont icon-html text-3xl! text-orange-600"></span>
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
