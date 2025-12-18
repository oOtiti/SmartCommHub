import icon from '../assets/icon.png';
const Home = () => {
  return (
    <div className="Home">
      <div className="header w-100% h-[90px]">
        <div className="wapper flex w-80% h-[90px] m-auto items-center">
          <div className="logo m-r-[30px]">
            <a href="#" className="flex ">
              <img src={icon} alt="LOGO图片" title="主页" className="h-[90px] w-auto " />
              <h1 className="w-[245px] font-800 text-3xl h-[90px] leading-[90px] text-[#53FF53]">
                智慧社区服务中心
              </h1>
            </a>
          </div>
          <ul className="flex w-[500px] h-[90px] leading-[90px] font-600 text-size-xl justify-evenly ">
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
            <a href="#" className="flex items-center">
              <span className="iconfont icon-hezuohuoban inline-block text-2xl! m-r-[10px] "></span>
              <span className="font-550 inline-block leading-[90px] w-100px">获取服务</span>
            </a>
            <a href="#" className="text-[0px]">
              <span className="inline-block iconfont icon-sousuo text-[20px]!"></span>
            </a>
          </div>
        </div>
      </div>
      <div className="quciknavi w-100% h-[50px] bg-[#FFFAF4] ">
        <div className="wapper w-70% h-[50px] flex m-auto items-center">
          <ul className="flex leading-[50px] font-500 justify-evenly">
            <li className="w-[100px] h-[50px] text-center">
              <a href="#" className="leading-[50px]">
                首页
              </a>
            </li>
            <li className="w-[100px] h-[50px] text-center">
              <a href="#" className="leading-[50px]">
                中心概况
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
      </div>
      <div className="body w-full h-[500px]">
        <div className="wapper"></div>
        <div className="Carousel"></div>
      </div>
      <div className="feeter h-[300px] bg-[#F0FFF0]">
        <div className="wapper w-80%  m-auto p-t-[20px]">
          <div className="friendhelpboard font-800 text-3xl w-100% h-[50px] text-center">
            友情链接
          </div>
          <ul className="w-full h-[100px] flex items-centeri justify-center m-t-[5px]">
            <li className="m-r-[10px]">
              <a href="#">项目主页</a>
            </li>
            <li className="m-r-[10px]">
              <a href="#">技术栈</a>
            </li>
            <li className="m-r-[10px]">
              <a href="#">WIKI</a>
            </li>
            <li className="m-r-[10px]">
              <a href="#">支持我们</a>
            </li>
          </ul>
        </div>
        <div className="PropertyRightsStatement w-100% text-center">
          ©2025暨南大学本科课程设计 --开源设计--
        </div>
      </div>
      <div className="helpnavi"></div>
    </div>
  );
};

export default Home;
