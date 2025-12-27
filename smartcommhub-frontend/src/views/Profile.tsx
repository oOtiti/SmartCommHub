import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import icon from '../assets/icon.png';

// 定义类型
type SidebarOption = 'userInfo' | 'userProfile' | 'orderManage' | 'aiAnalysis' | 'settings';
type AiSubFunction = 'demandAnalysis' | 'satisfaction' | 'recommendation' | 'consumptionTrend';
type AiAgent = 'qwen' | 'chatgpt' | 'ernie' | 'gemini';

// 侧边栏选项
const sidebarOptions = [
  { key: 'userInfo' as SidebarOption, label: '用户基本信息' },
  { key: 'userProfile' as SidebarOption, label: '用户详细档案' },
  { key: 'orderManage' as SidebarOption, label: '我的订单' },
  { key: 'aiAnalysis' as SidebarOption, label: 'AI分析报告' },
  { key: 'settings' as SidebarOption, label: '系统设置' },
];

// AI子功能选项
const aiSubOptions = [
  { key: 'demandAnalysis' as AiSubFunction, label: '需求分析' },
  { key: 'satisfaction' as AiSubFunction, label: '满意度分析' },
  { key: 'recommendation' as AiSubFunction, label: '服务推荐' },
  { key: 'consumptionTrend' as AiSubFunction, label: '消费趋势' },
];

// AI智能体选项
const aiAgents = [
  { key: 'qwen' as AiAgent, label: '文心一言' },
  { key: 'chatgpt' as AiAgent, label: 'ChatGPT' },
  { key: 'ernie' as AiAgent, label: 'ERNIE Bot' },
  { key: 'gemini' as AiAgent, label: 'Gemini' },
];

const Profile = () => {
  // 登录状态管理 - 从localStorage获取以保持状态
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    // 初始化时从localStorage读取登录状态
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  // 侧边栏激活状态
  const [activeOption, setActiveOption] = useState<SidebarOption>('userInfo');
  // AI分析子功能激活状态
  const [activeAiFunc, setActiveAiFunc] = useState<AiSubFunction>('demandAnalysis');
  // AI智能体激活状态
  const [activeAgent, setActiveAgent] = useState<AiAgent>('qwen');

  // AI提问相关状态
  const [questionInput, setQuestionInput] = useState<string>('');
  const [aiReply, setAiReply] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 设置界面局部状态
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [aiApiUrl, setAiApiUrl] = useState<string>('https://api.example.com/ai/chat');
  const [aiApiKey, setAiApiKey] = useState<string>('sk_xxxxxxxxxxxxxxxxxxxxxxxx');
  const [allowAiAnalysis, setAllowAiAnalysis] = useState<boolean>(true);
  const [publicComment, setPublicComment] = useState<boolean>(false);
  const [receivePush, setReceivePush] = useState<boolean>(true);
  const [theme, setTheme] = useState<string>('blue');
  const [fontSize, setFontSize] = useState<string>('default');

  const navigate = useNavigate();

  // 当登录状态变化时保存到localStorage
  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn.toString());
  }, [isLoggedIn]);

  // 切换侧边栏激活项
  const handleSidebarClick = (option: SidebarOption) => {
    setActiveOption(option);
  };

  // 切换AI分析子功能
  const handleAiFuncClick = (func: AiSubFunction) => {
    setActiveAiFunc(func);
  };

  // AI提问处理
  const handleSubmitQuestion = () => {
    if (!questionInput.trim()) {
      alert('请输入您要询问的内容！');
      return;
    }
    if (!allowAiAnalysis) {
      alert('请先在系统设置中启用AI分析功能！');
      return;
    }
    if (!aiApiUrl.trim() || !aiApiKey.trim()) {
      alert('请先在系统设置中配置完整的AI API地址和密钥！');
      return;
    }

    setLoading(true);
    setError('');
    setAiReply('');

    // 模拟网络延迟
    setTimeout(() => {
      try {
        const agentName = aiAgents.find((item) => item.key === activeAgent)?.label;
        let replyContent = '';
        switch (activeAgent) {
          case 'qwen':
            replyContent = `【${agentName}】您好！针对您提出的"${questionInput}"，我为您提供相关参考信息：1. 健康知识方面，建议保持每日1小时有氧运动，饮食以清淡为主；2. 社区服务相关问题，可前往"解决方案"板块查看详细说明；3. 若有其他疑问，可随时补充提问。`;
            break;
          case 'chatgpt':
            replyContent = `【${agentName}】Hello! Regarding your question "${questionInput}", here's some information for you: Maintaining a regular lifestyle and balanced diet is crucial for health. For community service inquiries, you can contact the service center directly.`;
            break;
          case 'ernie':
            replyContent = `【${agentName}】您好，您询问的"${questionInput}"相关内容如下：健康养生需注意作息规律，避免熬夜；社区内的家政服务可通过订单管理板块下单，预计1-2个工作日内安排上门。`;
            break;
          case 'gemini':
            replyContent = `【${agentName}】Got it! Your question is "${questionInput}". Here's a quick guide: For health concerns, consult a professional doctor for personalized advice. For community services, check the official announcement for the latest updates.`;
            break;
          default:
            replyContent = `【${agentName}】您的问题"${questionInput}"已收到，相关信息如下：健康知识建议关注权威医疗平台，社区服务可联系工作人员获取帮助。`;
        }
        setAiReply(replyContent);
      } catch (err) {
        setError('模拟请求失败：请检查网络连接（仅样式展示）');
      } finally {
        setLoading(false);
        setQuestionInput('');
      }
    }, 1500);
  };

  // 保存设置
  const handleSaveSettings = () => {
    if (newPassword && newPassword !== confirmPassword) {
      alert('新密码与确认密码不一致！');
      return;
    }

    const savedSettings = {
      password: newPassword ? '已更新' : '未修改',
      phone: newPhone || '未修改',
      aiApiUrl,
      aiApiKey,
      allowAiAnalysis,
      publicComment,
      receivePush,
      theme,
      fontSize,
    };
    console.log('保存的设置：', savedSettings);
    alert('设置保存成功！');

    // 清空输入框
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNewPhone('');
  };

  // 渲染AI分析子内容
  const renderAiSubContent = () => {
    switch (activeAiFunc) {
      case 'demandAnalysis':
        return (
          <div className="mt-4 text-gray-600">
            <h4 className="text-lg font-semibold mb-2 text-[#1E90FF]">分析结果</h4>
            <p>
              您更倾向于选择家政服务（占比60%）和家电维修服务（占比30%），仅10%的需求为社区配送类服务。
            </p>
            <p className="mt-2">建议关注社区家政服务的年终特惠套餐，可享受更高性价比。</p>
            <div className="mt-3 bg-[#EBF5FF] p-3 rounded-lg">
              <span className="font-medium">AI小贴士：</span>{' '}
              您的服务需求集中在居家类，后续会优先为您推送相关服务信息。
            </div>
          </div>
        );
      case 'satisfaction':
        return (
          <div className="mt-4 text-gray-600">
            <h4 className="text-lg font-semibold mb-2 text-[#1E90FF]">分析结果</h4>
            <div className="flex items-center mb-2">
              <span>整体满意度：</span>
              <span className="ml-2 font-bold text-green-600">98分（满分100分）</span>
            </div>
            <div className="flex items-center mb-2">
              <span>社区平均满意度：</span>
              <span className="ml-2 font-medium">92分</span>
            </div>
            <p>
              您对家政服务的满意度最高（100分），家电维修服务满意度为96分，整体评价优于社区平均水平。
            </p>
            <div className="mt-3 bg-[#EBF5FF] p-3 rounded-lg">
              <span className="font-medium">AI小贴士：</span>{' '}
              感谢您对社区服务的认可，我们会持续优化服务质量。
            </div>
          </div>
        );
      case 'recommendation':
        return (
          <div className="mt-4 text-gray-600">
            <h4 className="text-lg font-semibold mb-2 text-[#1E90FF]">个性化推荐列表</h4>
            <ul className="list-disc list-inside space-y-2">
              <li>XX家政年终特惠套餐（3次清洁服务，立减50元，有效期3个月）</li>
              <li>冬季家电深度保养服务（空调+洗衣机，组合价立减80元）</li>
              <li>社区生鲜配送包月服务（每日新鲜蔬菜配送，首月8折优惠）</li>
              <li>家庭水电安全检测服务（专业工程师上门，限时特惠99元/次）</li>
            </ul>
            <div className="mt-3 bg-[#EBF5FF] p-3 rounded-lg">
              <span className="font-medium">AI小贴士：</span>{' '}
              以上推荐基于您的历史订单和需求偏好生成，点击可直接下单。
            </div>
          </div>
        );
      case 'consumptionTrend':
        return (
          <div className="mt-4 text-gray-600">
            <h4 className="text-lg font-semibold mb-2 text-[#1E90FF]">分析结果</h4>
            <p>近3个月您的社区服务消费金额呈稳步上升趋势，月均消费约200元，主要集中在每月上旬。</p>
            <p className="mt-2">
              预计未来1个月，您可能会产生家电保养或家政清洁的消费需求，建议提前关注相关优惠。
            </p>
            <div className="mt-3 bg-[#EBF5FF] p-3 rounded-lg">
              <span className="font-medium">AI小贴士：</span>{' '}
              可开通消费提醒功能，及时获取您潜在需求的服务优惠。
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // 渲染主内容区域
  const renderShowContent = () => {
    switch (activeOption) {
      case 'userInfo':
        return (
          <div className="w-full h-full flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-[#1E90FF] mb-6">用户基本信息</h2>
            <div className="w-4/5 bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">用户名：</span>
                <span className="font-medium">zhangsan123</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">手机号：</span>
                <span className="font-medium">138****6789</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">邮箱：</span>
                <span className="font-medium">zhangsan@example.com</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-gray-600">注册时间：</span>
                <span className="font-medium">2025-01-15</span>
              </div>
            </div>
          </div>
        );
      case 'userProfile':
        return (
          <div className="w-full h-full flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-[#1E90FF] mb-6">用户详细档案</h2>
            <div className="w-4/5 bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">真实姓名：</span>
                <span className="font-medium">张三</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">性别：</span>
                <span className="font-medium">男</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">年龄：</span>
                <span className="font-medium">28</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">居住地址：</span>
                <span className="font-medium">广东省广州市天河区XX社区XX栋</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-gray-600">身份类型：</span>
                <span className="font-medium">普通居民</span>
              </div>
            </div>
          </div>
        );
      case 'orderManage':
        return (
          <div className="w-full h-full flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-[#1E90FF] mb-6">我的订单</h2>
            <div className="w-4/5 bg-white rounded-xl shadow-md p-6">
              <table className="w-full text-center">
                <thead className="bg-[#EBF5FF]">
                  <tr>
                    <th className="p-2 rounded-l-lg">订单编号</th>
                    <th className="p-2">服务类型</th>
                    <th className="p-2">下单时间</th>
                    <th className="p-2">订单状态</th>
                    <th className="p-2 rounded-r-lg">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-2">ORDER2025001</td>
                    <td className="p-2">家政清洁</td>
                    <td className="p-2">2025-12-01</td>
                    <td className="p-2 text-green-600">已完成</td>
                    <td className="p-2">
                      <button className="text-[#1E90FF] hover:underline">查看详情</button>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-2">ORDER2025002</td>
                    <td className="p-2">家电维修</td>
                    <td className="p-2">2025-12-10</td>
                    <td className="p-2 text-blue-600">待服务</td>
                    <td className="p-2">
                      <button className="text-[#1E90FF] hover:underline">取消订单</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">ORDER2025003</td>
                    <td className="p-2">社区配送</td>
                    <td className="p-2">2025-12-20</td>
                    <td className="p-2 text-orange-600">配送中</td>
                    <td className="p-2">
                      <button className="text-[#1E90FF] hover:underline">跟踪物流</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'aiAnalysis':
        return (
          <div className="w-full h-full flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-[#1E90FF] mb-6">档案AI分析报告</h2>
            <div className="w-4/5 bg-white rounded-xl shadow-md p-6">
              {/* 智能体选择区域 */}
              <div className="mb-6">
                <label className="text-gray-700 font-medium mr-3">选择智能体：</label>
                <div className="flex flex-wrap gap-3 inline-block">
                  {aiAgents.map((agent) => (
                    <button
                      key={agent.key}
                      className={`px-4 py-1.5 rounded-lg transition-colors text-sm
                        ${
                          activeAgent === agent.key
                            ? 'bg-[#1E90FF] text-white font-semibold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      onClick={() => setActiveAgent(agent.key)}
                    >
                      {agent.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI子功能选择按钮组 */}
              <div className="flex flex-wrap gap-3 mb-6">
                {aiSubOptions.map((func) => (
                  <button
                    key={func.key}
                    className={`px-4 py-2 rounded-lg transition-colors
                      ${
                        activeAiFunc === func.key
                          ? 'bg-[#1E90FF] text-white font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    onClick={() => handleAiFuncClick(func.key)}
                  >
                    {func.label}
                  </button>
                ))}
              </div>

              {/* 当前选中智能体提示 */}
              <div className="bg-[#EBF5FF] p-2 rounded-lg mb-4 text-sm text-[#1E90FF]">
                当前使用智能体：
                <span className="font-semibold">
                  {aiAgents.find((item) => item.key === activeAgent)?.label}
                </span>
              </div>

              {/* AI提问区域 */}
              <div className="mb-6 border-t border-b border-gray-200 py-4">
                <h4 className="text-lg font-semibold mb-3 text-[#333]">AI智能问答</h4>
                <div className="relative w-full">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF] pr-20"
                    disabled={loading}
                  />
                  {/* 引导提示语 */}
                  {!questionInput.trim() && !loading && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      可以询问我健康知识、社区服务相关问题哦~
                    </div>
                  )}
                  {/* 提交按钮 */}
                  <button
                    onClick={handleSubmitQuestion}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg transition-colors text-sm
                      ${
                        loading
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-[#1E90FF] text-white hover:bg-[#187bcd]'
                      }`}
                    disabled={loading}
                  >
                    {loading ? '正在提问...' : '提问'}
                  </button>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mb-6 bg-red-50 p-3 rounded-lg border border-red-200 text-red-600">
                  ⚠️ {error}
                </div>
              )}

              {/* AI回答展示 */}
              {aiReply && (
                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h5 className="font-semibold text-[#1E90FF] mb-2">AI回答：</h5>
                  <p className="text-gray-700">{aiReply}</p>
                </div>
              )}

              {/* AI子功能内容 */}
              {renderAiSubContent()}
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-6">
            <h2 className="text-2xl font-bold text-[#1E90FF] mb-6">系统设置</h2>

            <div className="w-4/5 bg-white rounded-xl shadow-md p-6 space-y-8">
              {/* 账号设置 */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-[#333] border-b pb-2 border-gray-200">
                  账号设置
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-gray-600 block">原密码</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                      placeholder="请输入原密码"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-gray-600 block">新密码</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                        placeholder="请输入新密码"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-gray-600 block">确认新密码</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                        placeholder="请再次输入新密码"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-600 block">更换手机号</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                      placeholder="请输入新手机号"
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 block">绑定邮箱</label>
                    <span className="text-gray-500">zhangsan@example.com（已绑定）</span>
                  </div>
                </div>
              </div>

              {/* AI API配置 */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-[#333] border-b pb-2 border-gray-200">
                  AI API 配置
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-gray-600 block">AI 接口地址</label>
                    <input
                      type="text"
                      value={aiApiUrl}
                      onChange={(e) => setAiApiUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                      placeholder="请输入AI接口完整地址"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-600 block">AI 接口密钥</label>
                    <input
                      type="text"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                      placeholder="请输入AI接口密钥"
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <label className="text-gray-600">启用AI分析功能</label>
                    <input
                      type="checkbox"
                      checked={allowAiAnalysis}
                      onChange={(e) => setAllowAiAnalysis(e.target.checked)}
                      className="w-5 h-5 accent-[#1E90FF]"
                    />
                  </div>
                </div>
              </div>

              {/* 隐私设置 */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-[#333] border-b pb-2 border-gray-200">
                  隐私设置
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-600">公开我的服务评价</label>
                    <input
                      type="checkbox"
                      checked={publicComment}
                      onChange={(e) => setPublicComment(e.target.checked)}
                      className="w-5 h-5 accent-[#1E90FF]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-600">接收服务优惠推送</label>
                    <input
                      type="checkbox"
                      checked={receivePush}
                      onChange={(e) => setReceivePush(e.target.checked)}
                      className="w-5 h-5 accent-[#1E90FF]"
                    />
                  </div>
                </div>
              </div>

              {/* 界面设置 */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-[#333] border-b pb-2 border-gray-200">
                  界面设置
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-600">主题风格</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTheme('blue')}
                        className={`w-8 h-8 rounded-full border-2 ${theme === 'blue' ? 'border-black' : 'border-transparent'}`}
                        style={{ backgroundColor: '#1E90FF' }}
                      ></button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-black' : 'border-transparent'}`}
                        style={{ backgroundColor: '#333' }}
                      ></button>
                      <button
                        onClick={() => setTheme('light')}
                        className={`w-8 h-8 rounded-full border-2 ${theme === 'light' ? 'border-black' : 'border-transparent'}`}
                        style={{ backgroundColor: '#f5f5f5' }}
                      ></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-600">字体大小</label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                    >
                      <option value="default">默认</option>
                      <option value="small">偏小</option>
                      <option value="large">偏大</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 保存按钮 */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2 bg-[#1E90FF] text-white rounded-lg hover:bg-[#187bcd] transition-colors font-semibold"
                >
                  保存所有设置
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="Profile">
      <header className={`w-full bg-[#1E90FF]`}>
        <div className="wrapper flex w-[80%] h-[60px] m-auto items-center mr-[50px]">
          <div className="logo mr-[30px]">
            <a
              href="javascript:;"
              onClick={() => {
                navigate('/'); // 使用react-router导航，避免页面刷新
              }}
              className="flex "
            >
              <img src={icon} alt="LOGO图片" title="主页" className="h-[60px] w-auto mt-[15px]" />
              <h1 className="w-[245px] font-bold text-2xl h-[60px] leading-[60px] text-white mt-[15px]">
                智慧社区服务中心
              </h1>
            </a>
          </div>
          <ul className="flex w-[500px] h-[60px] leading-[60px] font-semibold justify-evenly items-center mt-[20px]">
            <li>
              <a href="#" className="text-white">
                解决方案
              </a>
            </li>
            <li>
              <a href="#" className="text-white">
                社区近况
              </a>
            </li>
            <li>
              <a href="#" className="text-white">
                运营商招揽
              </a>
            </li>
            <li>
              <a href="#" className="text-white">
                志愿者中心
              </a>
            </li>
          </ul>
          <div className="search w-[100px] h-[60px] leading-[60px] flex">
            <a href="#" className="flex items-center ml-[50px]">
              <span className="iconfont icon-hezuohuoban inline-block text-2xl mr-[15px] font-semibold text-white"></span>
              <span className="font-semibold inline-block leading-[60px] w-[100px] text-white">
                获取服务
              </span>
            </a>
            <a href="#" className="text-[0px]">
              <span className="inline-block iconfont icon-sousuo text-20px font-semibold text-white"></span>
            </a>
          </div>
        </div>
      </header>
      <main className="">
        <div className="wrapper w-[80%] flex m-auto">
          <div className="boxbody w-full h-[1020px] mt-[20px] shadow-lg rounded-2xl flex p-2">
            <aside className="bg-[#d7eaf7] h-[980px] w-[200px] rounded-3xl ml-[20px]">
              <ul className="font-semibold text-[20px] mt-[20px] text-center flex flex-col h-full w-full">
                {sidebarOptions.map((option, index) => (
                  <li
                    key={option.key}
                    className={`mt-[${index === 0 ? 50 : 20}px] border-2 border-dotted border-[#1E90FF] hover:bg-gray-100 cursor-pointer py-2 rounded-lg transition-colors
                      ${activeOption === option.key ? 'bg-[#1E90FF] text-white' : 'text-[#333]'}`}
                    onClick={() => handleSidebarClick(option.key)}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            </aside>
            {/* 渲染内容区域 */}
            <div className="show flex-1 ml-4 h-[980px] bg-gray-50 rounded-3xl overflow-auto">
              {renderShowContent()}
            </div>
          </div>
        </div>
      </main>
      <footer className="h-[240px] bg-[#EBF5FF] mt-[50px]">
        <div className="wrapper w-[80%] m-auto pt-[20px]">
          <div className="friendhelpboard font-bold text-3xl w-full h-[50px] text-center">
            友情链接
          </div>
          <ul className="w-full h-[40px] flex items-center justify-center mt-[5px] font-semibold mt-[25px]">
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
            <ul className="flex justify-center items-center mt-4">
              <li>
                <a href="https://developer.mozilla.org/zh-CN/docs/Web/HTML" className="mr-[20px]">
                  <span className="iconfont icon-html text-3xl! text-orange-600"></span>
                </a>
              </li>
              <li>
                <a href="https://zh-hans.react.dev/" className="mr-[20px]">
                  <span className="iconfont icon-react text-3xl! text-blue-500"></span>
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

export default Profile;
