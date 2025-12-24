import icon from '../assets/icon.png';
import { Carousel } from 'antd';
import 'antd/dist/reset.css';
import photo1 from '../assets/Photo/1.jpg';
import photo2 from '../assets/Photo/2.webp';
import photo3 from '../assets/Photo/3.png';
import photo4 from '../assets/Photo/大图片.png';
import wechat from '../assets/Photo/微信.jpg';
import '../assets/iconfont/iconfont.json';
import '../styles/home-aside.css';
const Home = () => {
  return (
    <div className="Home relative">
      <header className="w-100% h-[90px] bg-[#E29F5C]">
        <div className="wapper flex w-70% h-[90px] m-auto items-center">
          <div className="logo m-r-[30px]">
            <a href="#" className="flex ">
              <img src={icon} alt="LOGO图片" title="主页" className="h-[90px] w-auto m-t-[15px] " />
              <h1 className="w-[245px] font-800 text-3xl h-[90px] leading-[90px] text-light m-t-[15px]">
                智慧社区服务中心
              </h1>
            </a>
          </div>
          <ul className="flex w-[500px] h-[90px] leading-[90px] font-600 text-size-xl justify-evenly  items-center m-t-[20px]">
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
          <div className="search w-[100px] h-[90px] leading-[90px] flex">
            <a href="#" className="flex items-center m-l-[50px]">
              <span className="iconfont icon-hezuohuoban inline-block text-2xl! m-r-[15px] font-600 "></span>
              <span className="font-600 inline-block leading-[90px] w-100px">获取服务</span>
            </a>
            <a href="#" className="text-[0px]">
              <span className="inline-block iconfont icon-sousuo text-[20px]! font-600"></span>
            </a>
            <a href="#" className="text-[20px] m-l-[60px] flex font-500">
              login
              <span className="inline-block iconfont icon-yonghuguanli text-[25px]! m-l-[10px]"></span>
            </a>
          </div>
        </div>
      </header>
      <nav className=" w-100% h-[50px] bg-[#FAF9F7] p-t-[5px] ">
        <div className="wapper w-60% h-[50px] flex m-auto items-center">
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
      <aside className="fixed right-15% bottom-40% border-[5px] border-dotted border-blue">
        <div className="box h-[410px] w-[70px] border-2px-solid">
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
            <li className="fix w-[70px] hover:bg-gray relative transition-all duration-300">
              <a href="#" className="flex flex-col items-center">
                <span className="iconfont icon-weixin1 inline-block h-[50px] text-center text-4xl!"></span>
                联系我们
              </a>
              {/* <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 w-64 h-48 bg-white rounded-lg shadow-lg opacity-0 pointer-events-none hover:opacity-1 transition-opacity duration-300 overflow-hidden z-10">
                <img src={wechat} alt="微信联系二维码" className="w-full h-full object-cover" />
                <div className="bg-[#F2F0EB] p-2 text-center text-[#4A4640] text-xs">
                  扫码添加微信，获取专属服务
                </div>
              </div> */}
            </li>
            <li className="m-b-[10px] w-[70px] hover:bg-gray">
              <a href="#" className="flex flex-col items-center">
                <span className="iconfont icon-jiaoseguanli inline-block h-[50px] text-center text-4xl!"></span>
                报告查询
              </a>
            </li>
            <li className="m-b-[10px] w-[70px] hover:bg-gray">
              <a href="#" className="flex flex-col items-center">
                <span className="iconfont icon-yonghuguanli1 inline-block h-[50px] text-center text-4xl!"></span>
                人工客服
              </a>
            </li>
            <li className="m-b-[10px] w-[70px] hover:bg-gray">
              <a href="#" className="flex flex-col items-center">
                <span className="iconfont icon-qudenglu inline-block h-[50px] text-center text-4xl!"></span>
                就诊预约
              </a>
            </li>
          </ul>
        </div>
      </aside>
      <main className="body w-full h-[1500px] bg-[#FAF9F7]">
        <div className="wapper w-[60%] m-auto">
          <Carousel autoplay={true} infinite draggable={true} arrows={true} className="h-[500px]">
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
          <article className="m-t-[100px]">
            <h2 className="font-650 text-3xl">系统功能</h2>
            <section>
              智慧社区服务中心系统是为社区老年群体打造的综合服务支撑平台，它打通了居家养老、社区照料、健康管理等多类资源：老人可通过系统线上预约助餐、助浴、上门护理等便民服务，社区医养团队能同步获取老人的健康数据并及时响应需求；同时系统还衔接了社区的智能服务设备（如适老互动机器人），能为老人提供休闲娱乐、生活提醒等日常辅助，让老人不出社区就能对接各类所需服务，家属也能通过系统实时了解老人的社区生活状态。
            </section>
          </article>
          <article className="m-t-[100px]">
            <h2 className="font-650 text-3xl">核心优点</h2>
            <section>
              这个系统的优势在于 “适老化 + 精准化”
              的双重适配：操作端采用大字体、语音交互等适老设计，即便是不熟悉智能设备的老人，也能轻松完成服务预约；同时它会根据老人的生活习惯、健康状况智能匹配服务
              —— 比如自动提醒慢病老人按时测血压、依据季节推荐温和的社区活动，既避免了传统服务的
              “一刀切”，也让老人感受到贴合需求的暖心照料，间接减轻了家属远程照护的日常顾虑。
            </section>
          </article>
          <h2 className="font-650 text-4xl text-center m-t-[100px]">场景运用</h2>
          <div className="display flex justify-center items-center h-[300px]">
            <a href="#" className="">
              <img src={photo4} alt="展示图片无法显示" className="h-[300px]" />
            </a>
          </div>
        </div>
      </main>
      <footer className=" h-[240px] bg-[#EFEAE6]">
        <div className="wapper w-80%  m-auto p-t-[20px]">
          <div className="friendhelpboard font-800 text-3xl w-100% h-[50px] text-center">
            友情链接
          </div>
          <ul className="w-full h-[40px] flex items-centeri justify-center m-t-[5px] font-600 m-t-[25px]">
            <li className="m-r-[40px]">
              <a href="https://github.com/oOtiti/SmartCommHub">项目主页</a>
            </li>
            <li className="m-r-[40px]">
              <a href="#">技术栈</a>
            </li>
            <li className="m-r-[40px]">
              <a href="https://github.com/oOtiti/SmartCommHub">WIKI</a>
            </li>
            <li className="">
              <a href="#">支持我们</a>
            </li>
          </ul>
          <div className="project">
            <ul className="flex justify-center items-center">
              <li>
                <a href="https://developer.mozilla.org/zh-CN/docs/Web/HTML" className="m-r-[20px]">
                  <span className="iconfont icon-html text-3xl!"></span>
                </a>
              </li>
              <li>
                <a href="https://zh-hans.react.dev/" className="m-r-[20px]">
                  <span className="iconfont icon-react text-3xl!"></span>
                </a>
              </li>
              <li>
                <a href="https://vitejs.cn/vite3-cn/guide/" className="m-r-[20px]">
                  <span className="iconfont icon-vite text-3xl!"></span>
                </a>
              </li>
              <li>
                <a href="https://www.python.org/" className="m-r-[20px]">
                  <span className="iconfont icon-python text-3xl!"></span>
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
