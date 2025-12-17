import icon from '../assets/icon.png';
const Home = () => {
  return (
    <div className="Home">
      <div className="header w-100% h-[90px] ">
        <div className="wapper flex w-70% h-[90px] m-auto items-center">
          <div className="logo m-r-[50px]">
            <a href="#" className="flex ">
              <img src={icon} alt="LOGO图片" title="主页" className="h-[90px] w-auto " />
              <h1 className="font-800 text-3xl h-[90px] leading-[90px] text-[#26eb39]">
                智慧社区服务中心
              </h1>
            </a>
          </div>
          <ul className="flex justify-evenly w-[700px] h-[90px] leading-[90px] font-600 text-size-xl">
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
          <div className="search w-[100px] h-[90px] ">text</div>
        </div>
      </div>
      <div className="quciknavi"></div>
      <div className="body">
        <div className="Carousel"></div>
      </div>
      <div className="feeter">
        <div className="helpnavi"></div>
        <div className="PropertyRightsStatement"></div>
      </div>
    </div>
  );
};

export default Home;
