// 商户管理界面 - 独立文件
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const MerchantServer = () => {
  const navigate = useNavigate(); // 用于返回首页

  return (
    <div className="merchant-server min-h-screen bg-[#F5F7FA]">
      {/* 商户头部 */}
      <header className="w-full bg-[#1E90FF] text-white py-4 px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">智慧社区 - 商户管理中心</h1>
          <Button type="default" onClick={() => navigate('/')} className="bg-white text-[#1E90FF]">
            返回首页
          </Button>
        </div>
      </header>

      {/* 商户核心功能区 */}
      <main className="w-[80%] m-auto py-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* 功能卡片1：订单管理 */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold text-[#1E90FF] mb-4">订单管理</h3>
            <ul className="text-gray-700 space-y-2">
              <li>• 待处理订单</li>
              <li>• 已完成订单</li>
              <li>• 退款/售后处理</li>
              <li>• 订单数据导出</li>
            </ul>
            <Button type="primary" className="mt-4 w-full bg-[#1E90FF]">
              进入管理
            </Button>
          </div>

          {/* 功能卡片2：服务配置 */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold text-[#1E90FF] mb-4">服务配置</h3>
            <ul className="text-gray-700 space-y-2">
              <li>• 服务项目上架</li>
              <li>• 价格/库存调整</li>
              <li>• 服务标签设置</li>
              <li>• 优惠券配置</li>
            </ul>
            <Button type="primary" className="mt-4 w-full bg-[#1E90FF]">
              进入配置
            </Button>
          </div>

          {/* 功能卡片3：数据统计 */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold text-[#1E90FF] mb-4">经营数据</h3>
            <ul className="text-gray-700 space-y-2">
              <li>• 今日/本月营收</li>
              <li>• 服务人次统计</li>
              <li>• 客户画像分析</li>
              <li>• 竞品对比分析</li>
            </ul>
            <Button type="primary" className="mt-4 w-full bg-[#1E90FF]">
              查看报表
            </Button>
          </div>
        </div>

        {/* 商户信息面板 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-[#1E90FF] mb-4">商户基本信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">商户名称：智慧社区便民服务站</p>
              <p className="text-gray-600">商户编号：SC2025001</p>
              <p className="text-gray-600">联系人：张先生</p>
            </div>
            <div>
              <p className="text-gray-600">联系电话：138XXXX8888</p>
              <p className="text-gray-600">入驻时间：2025-01-01</p>
              <p className="text-gray-600">
                店铺状态：<span className="text-green-600">正常营业</span>
              </p>
            </div>
          </div>
          <Button type="default" className="mt-4">
            编辑商户信息
          </Button>
        </div>
      </main>
    </div>
  );
};

export default MerchantServer;
