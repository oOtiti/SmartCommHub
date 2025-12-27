import icon from '../assets/icon.png';
import { Carousel } from 'antd';
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
import Uesr from
const Nav = () => {
  const [showHeader, setShowHeader] = useState(true);
  useEffect(() => {
    const handelScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setShowHeader(scrollTop <= 0);
    };
    window.addEventListener('scroll', handelScroll);
    return () => {
      window.removeEventListener('scroll', handelScroll);
    };
  }, []);
  return (
    <nav
      className={`w-full bg-[#EBF5FF] pt-[5px] transition-all duration-300 ${showHeader ? 'hidden' : 'fixed h-[50px] z-10 top-0'}`}
    >
      <div className="wrapper w-60% h-[50px] flex m-auto items-center">
        <ul className="flex leading-[50px] font-600 justify-evenly text-[17px] leading-[50px]">
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
  return (
    <div className="Home relative">
      <header className={`w-full  bg-[#1E90FF]`}>
        <div className="wrapper flex w-80% h-[60px] m-auto items-center mr-[50px]">
          <div className="logo mr-[30px]">
            <a href="#" className="flex ">
              <img src={icon} alt="LOGO图片" title="主页" className="h-[60px] w-auto mt-[15px] " />
              <h1 className="w-[245px] font-800 text-2xl h-[60px] leading-[60px] text-light mt-[15px]">
                智慧社区服务中心
              </h1>
            </a>
          </div>
          <ul className="flex w-[500px] h-[60px] leading-[60px] font-600  justify-evenly  items-center mt-[20px]">
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
          <div className="search w-[100px] h-[60px] leading-[60px] flex">
            <a href="#" className="flex items-center ml-[50px]">
              <span className="iconfont icon-hezuohuoban inline-block text-2xl! mr-[15px] font-600 "></span>
              <span className="font-600 inline-block leading-[60px] w-100px">获取服务</span>
            </a>
            <a href="#" className="text-[0px]">
              <span className="inline-block iconfont icon-sousuo text-[20px]! font-600"></span>
            </a>

          </div>
        </div>
      </header>
      <Nav></Nav>
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
      <main className="body w-full  bg-[#FFFFFF]">
        <div className="wrapper w-[60%] m-auto">
          <Carousel
            autoplay={true}
            infinite
            draggable={true}
            arrows={true}
            className="h-[500px] mt-[5px]"
          >
            <div className="photo h-[500px]">
              <img src={photo1} alt="这个一张社区图片" className="w-full h-[500px]" />
            </div>
            <div className="photo h-[500px]">
              <img src={photo2} alt="这个一张社区图片" className="w-full h-[500px]" />
            </div>
            <div className="photo h-[500px]">
              <img src={photo3} alt="这个一张社区图片" className="w-full h-[500px]" />
            </div>
          </Carousel>
        </div>
        <div className="h-[600px]">
          <article
            className="h-full mt-[100px] bg-no-repeat bg-cover bg-center px-8 py-12"
            style={{
              backgroundImage: `url(${photo5})`,
              backgroundBlendMode: 'overlay',
            }}
          >
            <div className="max-w-4xl mx-auto mb-10">
              <h2 className="font-650 text-3xl text-[#4167B1] text-center mb-6 pb-2 border-b-2 border-[#4167B1]/30">
                系统功能
              </h2>
              <div className="w-full bg-[#EBF5FF]/90 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                <section className="text-gray-700 leading-7 text-lg">
                  智慧社区服务中心系统是为社区老年群体打造的综合服务支撑平台，它打通了居家养老、社区照料、健康管理等多类资源：老人可通过系统线上预约助餐、助浴、上门护理等便民服务，社区医养团队能同步获取老人的健康数据并及时响应需求；同时系统还衔接了社区的智能服务设备（如适老互动机器人），能为老人提供休闲娱乐、生活提醒等日常辅助，让老人不出社区就能对接各类所需服务，家属也能通过系统实时了解老人的社区生活状态。
                </section>
              </div>
            </div>
            <div className="max-w-4xl mx-auto">
              <h2 className="font-650 text-3xl text-[#4167B1] text-center mb-6 pb-2 border-b-2 border-[#4167B1]/30">
                核心优点
              </h2>
              <div className="w-full bg-[#EBF5FF]/90 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                <section className="text-gray-700 leading-7 text-lg">
                  这个系统的优势在于 “适老化 +
                  精准化”的双重适配：操作端采用大字体、语音交互等适老设计，即便是不熟悉智能设备的老人，也能轻松完成服务预约；同时它会根据老人的生活习惯、健康状况智能匹配服务——比如自动提醒慢病老人按时测血压、依据季节推荐温和的社区活动，既避免了传统服务的“一刀切”，也让老人感受到贴合需求的暖心照料，间接减轻了家属远程照护的日常顾虑。
                </section>
              </div>
            </div>
          </article>
        </div>
        {/* ========== 优化结束 ========== */}
        <div className="wrapper w-[60%] m-auto">
          <h2 className="font-650 text-4xl text-center mt-[100px] text-[#4167B1]">场景运用</h2>
          <div className="display flex justify-center items-center h-[300px]">
            <a href="#" className="">
              <img src={photo4} alt="展示图片无法显示" className="h-[300px]" />
            </a>
          </div>
          <h2 className="font-650 text-4xl text-center mt-[100px] text-[#4167B1]">平台特点</h2>
          <div className="h-[500px] w-full">
            <ul className="flex justify-evenly mt-[20px]">
              <li className="w-[210px]">
                <h3 className="font-650 leading-[50px]">
                  <span className="iconfont icon-chakan text-2xl! leading-[50px] inline-block h-[50px] mr-[4px]"></span>
                  安消适老物联：全天候安全防护
                </h3>
                <p>
                  依托物联接入能力，整合消防安防设备与老人紧急呼叫、跌倒感应等适老设施，全时监测设备状态。
                </p>
              </li>
              <li className="w-[210px]">
                <h3 className="font-650 leading-[50px]">
                  <span className="iconfont icon-chakan text-2xl! leading-[50px] inline-block h-[50px] mr-[4px]"></span>
                  智能预警：关怀快人一步
                </h3>
                <p>
                  通过智能分析，老人跌倒、温感异常等紧急情况 3
                  秒内推送给护理员、家属、值班中心；区域入侵、电梯隐患等场景分级预警，让服务响应追上需求。
                </p>
              </li>
              <li className="w-[210px]">
                <h3 className="font-650 leading-[50px]">
                  <span className="iconfont icon-chakan text-2xl! leading-[50px] inline-block h-[50px] mr-[4px]"></span>
                  数据联网：打通养老协同
                </h3>
                <p>
                  以标准化数据联网，同步社区设备、老人安全数据至街道、卫生服务站等。独居老人未用助餐设备，网格员自动收到探视提醒，让社区服务接入全域养老资源。
                </p>
              </li>
              <li className="w-[210px]">
                <h3 className="font-650 leading-[50px]">
                  <span className="iconfont icon-chakan text-2xl! leading-[50px] inline-block h-[50px] mr-[4px]"></span>
                  适老应用：贴心又高效
                </h3>
                <p>
                  分角色适配：老人有大字版
                  “一键服务”，家属能远程看告警，物业可派单跟踪服务，既提效又让老人便捷享关怀。
                </p>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <footer className=" h-[240px] bg-[#EBF5FF]">
        <div className="wrapper w-80%  m-auto pt-[20px]">
          <div className="friendhelpboard font-800 text-3xl w-100% h-[50px] text-center">
            友情链接
          </div>
          <ul className="w-full h-[40px] flex items-center justify-center mt-[5px] font-600 mt-[25px]">
            <li className="mr-[40px]">
              <a href="https://github.com/oOtiti/SmartCommHub">项目主页</a>
            </li>
            <li className="mr-[40px]">
              <a href="#">技术栈</a>
            </li>
            <li className="mr-[40px]">
              <a href="https://github.com/oOtiti/SmartCommHub">WIKI</a>
            </li>
            <li className="">
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
          <p className="h-[50px] leading-[50px] text-size-sm text-[#777777]">
            ©2025暨南大学本科课程设计 --开源设计--
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
