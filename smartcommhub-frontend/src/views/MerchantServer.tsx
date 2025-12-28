import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, message, Modal, Form, Input, Select, InputNumber } from 'antd';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import 'antd/dist/reset.css';

// ========== 类型定义 ==========
interface Provider {
  provider_id?: number;
  name: string;
  service_type: string;
  service_nature: string;
  qualification_id: string;
  contact: string;
  audit_status: string;
  belong_community: string;
}

interface ServiceItem {
  service_id?: number;
  provider_id: number;
  name: string;
  content: string;
  duration: string;
  price: number;
  service_scope: string;
  status: string;
}

interface ServiceOrder {
  order_id?: number;
  elderly_id?: number;
  service_id?: number;
  reserve_time?: string;
  order_status?: string;
  pay_status?: string;
}

type ActiveTab = 'overview' | 'provider' | 'services' | 'orders';

const MerchantServer = () => {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  // 状态管理
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [serviceList, setServiceList] = useState<ServiceItem[]>([]);
  const [orderList, setOrderList] = useState<ServiceOrder[]>([]);
  const [isAdmin, setIsAdmin] = useState(false); // 管理员标识

  const [loading, setLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [providerForm] = Form.useForm();
  const [serviceForm] = Form.useForm();

  const [servicePage, setServicePage] = useState(1);
  const [servicePageSize] = useState(10);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize] = useState(10);
  const [totalServices, setTotalServices] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  // 初始化：加载商户信息
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/');
      return;
    }

    const loadProviderInfo = async () => {
      try {
        setLoading(true);
        // 先获取用户信息，然后获取其provider_id
        const userRes = await api.get('/auth/profile');
        const userData = userRes.data;

        // 检查用户类型，服务商（user_type === 2）和管理员（user_type === 3）都可以访问
        if (userData?.user_type === 3) {
          // 管理员可以访问商户中心
          setIsAdmin(true);
        } else if (userData?.user_type !== 2) {
          // 只有服务商和管理员可以访问商户中心
          message.error('只有服务商和管理员可以访问商户中心');
          navigate('/', { replace: true });
          return;
        }

        const providerId = userData?.provider_id;
        if (providerId) {
          const res = await api.get(`/providers/${providerId}`);
          setProvider(res.data);
        } else if (userData?.user_type !== 3) {
          // 非管理员必须有provider_id
          message.error('未找到关联的商户信息');
        }
      } catch (error) {
        message.error('加载商户信息失败');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadProviderInfo();
  }, [isLoggedIn, navigate]);

  // 加载服务列表
  const loadServices = async (page: number = 1) => {
    if (!provider?.provider_id) return;
    try {
      setServiceLoading(true);
      const offset = (page - 1) * servicePageSize;
      const res = await api.get('/services/', {
        params: {
          provider_id: provider.provider_id,
          offset,
          limit: servicePageSize,
        },
      });
      setServiceList(res.data?.items || []);
      setTotalServices(res.data?.total || 0);
      setServicePage(page);
    } catch (error) {
      message.error('加载服务列表失败');
      console.error(error);
    } finally {
      setServiceLoading(false);
    }
  };

  // 加载订单列表
  const loadOrders = async (page: number = 1) => {
    if (!provider?.provider_id) return;
    try {
      setOrderLoading(true);
      const offset = (page - 1) * orderPageSize;
      const res = await api.get('/orders/', {
        params: {
          provider_id: provider.provider_id,
          offset,
          limit: orderPageSize,
        },
      });
      setOrderList(res.data?.items || []);
      setTotalOrders(res.data?.total || 0);
      setOrderPage(page);
    } catch (error) {
      message.error('加载订单列表失败');
      console.error(error);
    } finally {
      setOrderLoading(false);
    }
  };

  // 编辑商户信息
  const handleEditProvider = () => {
    if (provider) {
      providerForm.setFieldsValue(provider);
      setShowProviderModal(true);
    }
  };

  // 保存商户信息
  const handleSaveProvider = async (values: Partial<Provider>) => {
    if (!provider?.provider_id) return;
    try {
      setLoading(true);
      await api.put(`/providers/${provider.provider_id}`, values);
      message.success('商户信息已更新');
      setShowProviderModal(false);
      loadProviderInfo();
    } catch (error) {
      message.error('更新商户信息失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 添加服务
  const handleAddService = () => {
    serviceForm.resetFields();
    setShowServiceModal(true);
  };

  // 保存服务
  const handleSaveService = async (values: Partial<ServiceItem>) => {
    try {
      setServiceLoading(true);
      await api.post('/services/', {
        provider_id: provider?.provider_id,
        ...values,
      });
      message.success('服务已添加');
      setShowServiceModal(false);
      loadServices(1);
    } catch (error) {
      message.error('添加服务失败');
      console.error(error);
    } finally {
      setServiceLoading(false);
    }
  };

  // 删除服务
  const handleDeleteService = async (serviceId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个服务吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/services/${serviceId}`);
          message.success('服务已删除');
          loadServices(servicePage);
        } catch (error) {
          message.error('删除服务失败');
          console.error(error);
        }
      },
    });
  };

  // 标签页内容
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* 商户基本信息 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#1E90FF]">商户基本信息</h3>
                <Button type="primary" onClick={handleEditProvider} className="bg-[#1E90FF]">
                  编辑信息
                </Button>
              </div>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : provider ? (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-600 mb-2">商户名称</p>
                    <p className="text-lg font-medium">{provider.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-2">资质编号</p>
                    <p className="text-lg font-medium">{provider.qualification_id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-2">服务类型</p>
                    <p className="text-lg font-medium">{provider.service_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-2">服务性质</p>
                    <p className="text-lg font-medium">{provider.service_nature}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-2">联系电话</p>
                    <p className="text-lg font-medium">{provider.contact}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-2">审核状态</p>
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        provider.audit_status === 'approved'
                          ? 'bg-green-100 text-green-600'
                          : provider.audit_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {provider.audit_status === 'approved'
                        ? '已批准'
                        : provider.audit_status === 'pending'
                          ? '审核中'
                          : '已拒绝'}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-2">所属社区</p>
                    <p className="text-lg font-medium">{provider.belong_community}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">未找到商户信息</div>
              )}
            </div>

            {/* 功能概览 */}
            <div className="grid grid-cols-3 gap-6">
              <div
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setActiveTab('services')}
              >
                <h3 className="text-xl font-bold text-[#1E90FF] mb-4">服务管理</h3>
                <p className="text-3xl font-bold text-gray-800 mb-2">{totalServices}</p>
                <p className="text-gray-600 text-sm">已发布服务项目</p>
              </div>
              <div
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setActiveTab('orders')}
              >
                <h3 className="text-xl font-bold text-[#1E90FF] mb-4">订单管理</h3>
                <p className="text-3xl font-bold text-gray-800 mb-2">{totalOrders}</p>
                <p className="text-gray-600 text-sm">待处理订单</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold text-[#1E90FF] mb-4">数据统计</h3>
                <p className="text-3xl font-bold text-gray-800 mb-2">98%</p>
                <p className="text-gray-600 text-sm">用户满意度</p>
              </div>
            </div>
          </div>
        );

      case 'services':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1E90FF]">服务项目管理</h3>
              <Button type="primary" onClick={handleAddService} className="bg-[#1E90FF]">
                + 新增服务
              </Button>
            </div>
            {serviceLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : serviceList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无服务项目</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-[#EBF5FF]">
                    <tr>
                      <th className="p-3 border border-gray-200">服务ID</th>
                      <th className="p-3 border border-gray-200">服务名称</th>
                      <th className="p-3 border border-gray-200">服务内容</th>
                      <th className="p-3 border border-gray-200">时长</th>
                      <th className="p-3 border border-gray-200">价格 (¥)</th>
                      <th className="p-3 border border-gray-200">服务范围</th>
                      <th className="p-3 border border-gray-200">状态</th>
                      <th className="p-3 border border-gray-200">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceList.map((service) => (
                      <tr
                        key={service.service_id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="p-3 border border-gray-200">#{service.service_id}</td>
                        <td className="p-3 border border-gray-200">{service.name}</td>
                        <td className="p-3 border border-gray-200 text-sm">
                          {service.content.substring(0, 30)}...
                        </td>
                        <td className="p-3 border border-gray-200">{service.duration}</td>
                        <td className="p-3 border border-gray-200 font-bold text-green-600">
                          ¥{service.price}
                        </td>
                        <td className="p-3 border border-gray-200 text-sm">
                          {service.service_scope.substring(0, 20)}...
                        </td>
                        <td className="p-3 border border-gray-200">
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              service.status === 'active'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {service.status === 'active' ? '已发布' : '未发布'}
                          </span>
                        </td>
                        <td className="p-3 border border-gray-200">
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() =>
                              service.service_id && handleDeleteService(service.service_id)
                            }
                          >
                            删除
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalServices > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  共 {totalServices} 个服务，当前第 {servicePage} 页
                </div>
                <div className="flex gap-2">
                  <Button disabled={servicePage <= 1} onClick={() => loadServices(servicePage - 1)}>
                    上一页
                  </Button>
                  <span className="px-3 py-1">
                    {servicePage} / {Math.ceil(totalServices / servicePageSize) || 1}
                  </span>
                  <Button
                    disabled={servicePage >= Math.ceil(totalServices / servicePageSize)}
                    onClick={() => loadServices(servicePage + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'orders':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-[#1E90FF] mb-6">订单管理</h3>
            {orderLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : orderList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无订单</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-[#EBF5FF]">
                    <tr>
                      <th className="p-3 border border-gray-200">订单编号</th>
                      <th className="p-3 border border-gray-200">服务ID</th>
                      <th className="p-3 border border-gray-200">下单时间</th>
                      <th className="p-3 border border-gray-200">订单状态</th>
                      <th className="p-3 border border-gray-200">支付状态</th>
                      <th className="p-3 border border-gray-200">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderList.map((order) => (
                      <tr
                        key={order.order_id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="p-3 border border-gray-200">#{order.order_id}</td>
                        <td className="p-3 border border-gray-200">{order.service_id || '-'}</td>
                        <td className="p-3 border border-gray-200">
                          {order.reserve_time
                            ? new Date(order.reserve_time).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="p-3 border border-gray-200">
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              order.order_status === 'completed'
                                ? 'bg-green-100 text-green-600'
                                : order.order_status === 'pending'
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-yellow-100 text-yellow-600'
                            }`}
                          >
                            {order.order_status || '未知'}
                          </span>
                        </td>
                        <td className="p-3 border border-gray-200">
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              order.pay_status === 'paid'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {order.pay_status || '未知'}
                          </span>
                        </td>
                        <td className="p-3 border border-gray-200">
                          <Button type="link" size="small">
                            详情
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalOrders > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  共 {totalOrders} 个订单，当前第 {orderPage} 页
                </div>
                <div className="flex gap-2">
                  <Button disabled={orderPage <= 1} onClick={() => loadOrders(orderPage - 1)}>
                    上一页
                  </Button>
                  <span className="px-3 py-1">
                    {orderPage} / {Math.ceil(totalOrders / orderPageSize) || 1}
                  </span>
                  <Button
                    disabled={orderPage >= Math.ceil(totalOrders / orderPageSize)}
                    onClick={() => loadOrders(orderPage + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isLoggedIn) {
    return <div>未登录</div>;
  }

  return (
    <div className="merchant-server min-h-screen bg-[#F5F7FA]">
      {/* 头部 */}
      <header className="w-full bg-[#1E90FF] text-white py-4 px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">智慧社区 - 商户管理中心</h1>
          <div className="flex gap-3">
            {/* 管理员专属：快速访问个人中心 */}
            {isAdmin && (
              <Button type="default" onClick={() => navigate('/Profile')} className="bg-white text-[#1E90FF]">
                前往个人中心
              </Button>
            )}
            <Button type="default" onClick={() => navigate('/')} className="bg-white text-[#1E90FF]">
              返回首页
            </Button>
          </div>
        </div>
      </header>

      {/* 导航标签 */}
      <div className="w-full bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-[90%] mx-auto flex gap-1">
          {[
            { key: 'overview' as ActiveTab, label: '概览' },
            { key: 'services' as ActiveTab, label: '服务管理' },
            { key: 'orders' as ActiveTab, label: '订单管理' },
            { key: 'provider' as ActiveTab, label: '商户设置' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === 'services') loadServices(1);
                if (tab.key === 'orders') loadOrders(1);
              }}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-[#1E90FF] border-b-2 border-[#1E90FF]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 主内容区 */}
      <main className="w-[90%] mx-auto py-8">{renderContent()}</main>

      {/* 商户信息编辑弹框 */}
      <Modal
        title="编辑商户信息"
        open={showProviderModal}
        onCancel={() => setShowProviderModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowProviderModal(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            className="bg-[#1E90FF]"
            onClick={() => providerForm.submit()}
          >
            保存
          </Button>,
        ]}
      >
        <Form form={providerForm} layout="vertical" onFinish={handleSaveProvider}>
          <Form.Item
            label="商户名称"
            name="name"
            rules={[{ required: true, message: '请输入商户名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="服务类型"
            name="service_type"
            rules={[{ required: true, message: '请输入服务类型' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="服务性质"
            name="service_nature"
            rules={[{ required: true, message: '请输入服务性质' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="联系电话"
            name="contact"
            rules={[{ required: true, message: '请输入联系电话' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="审核状态"
            name="audit_status"
            rules={[{ required: true, message: '请选择审核状态' }]}
          >
            <Select
              options={[
                { label: '审核中', value: 'pending' },
                { label: '已批准', value: 'approved' },
                { label: '已拒绝', value: 'rejected' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="所属社区"
            name="belong_community"
            rules={[{ required: true, message: '请输入所属社区' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 服务添加弹框 */}
      <Modal
        title="新增服务"
        open={showServiceModal}
        onCancel={() => setShowServiceModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowServiceModal(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={serviceLoading}
            className="bg-[#1E90FF]"
            onClick={() => serviceForm.submit()}
          >
            创建
          </Button>,
        ]}
      >
        <Form form={serviceForm} layout="vertical" onFinish={handleSaveService}>
          <Form.Item
            label="服务名称"
            name="name"
            rules={[{ required: true, message: '请输入服务名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="服务内容"
            name="content"
            rules={[{ required: true, message: '请输入服务内容' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            label="服务时长"
            name="duration"
            rules={[{ required: true, message: '请输入服务时长' }]}
          >
            <Input placeholder="如：2小时" />
          </Form.Item>
          <Form.Item
            label="服务价格 (¥)"
            name="price"
            rules={[{ required: true, message: '请输入服务价格' }]}
          >
            <InputNumber min={0} step={0.01} />
          </Form.Item>
          <Form.Item
            label="服务范围"
            name="service_scope"
            rules={[{ required: true, message: '请输入服务范围' }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            label="服务状态"
            name="status"
            rules={[{ required: true, message: '请选择服务状态' }]}
            initialValue="active"
          >
            <Select
              options={[
                { label: '已发布', value: 'active' },
                { label: '未发布', value: 'inactive' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MerchantServer;
