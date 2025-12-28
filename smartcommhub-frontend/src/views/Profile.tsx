import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { message } from 'antd';
import icon from '../assets/icon.png';
import 'antd/dist/reset.css';
import '../styles/index.css';
import '../styles/home-aside.css';
import { useAuthStore } from '../store/auth';
import { api } from '../api/client';

// ========== 类型定义 ==========
interface UserProfile {
  id: number;
  username: string;
  user_type: number; // 3=管理员、0=其他、1=老人、2=服务商
  is_active: boolean;
  phone: string;
  email?: string;
  last_login_at?: string;
  created_at?: string;
  elderly_id?: number;
  family_id?: number;
  provider_id?: number;
  real_name?: string;
  gender?: string;
  age?: number;
  address?: string;
}

interface Elderly {
  id?: number;
  name: string;
  id_card: string;
  health_level: string;
  emergency_contact: string;
  address: string;
}

interface ElderlyListResponse {
  total: number;
  data: Elderly[];
}

interface ServiceOrder {
  order_id?: number;
  elderly_id?: number;
  service_id?: number;
  reserve_time?: string;
  service_time?: string;
  order_status?: string;
  pay_status?: string;
  eval_score?: number;
  eval_content?: string;
  eval_time?: string;
}

interface OrderListResponse {
  total: number;
  offset: number;
  limit: number;
  items: ServiceOrder[];
}

interface AccessRecord {
  access_id?: number;
  elderly_id?: number;
  access_type?: string; // IN | OUT
  record_time?: string;
  gate_location?: string;
  is_abnormal?: string; // YES | NO
}

interface AccessRecordListResponse {
  total: number;
  offset: number;
  limit: number;
  items: AccessRecord[];
}

type SidebarOption =
  | 'userInfo'
  | 'userProfile'
  | 'orderManage'
  | 'accessRecord'
  | 'elderlyMonitor'
  | 'aiAnalysis'
  | 'settings';
type AiSubFunction = 'demandAnalysis' | 'satisfaction' | 'recommendation' | 'consumptionTrend';
type AiAgent = 'qwen' | 'chatgpt' | 'ernie' | 'gemini';

// ========== 静态配置 ==========
const sidebarOptions = [
  { key: 'userInfo' as SidebarOption, label: '用户基本信息' },
  { key: 'userProfile' as SidebarOption, label: '用户详细档案' },
  { key: 'orderManage' as SidebarOption, label: '我的订单' },
  { key: 'accessRecord' as SidebarOption, label: '进出记录' },
  { key: 'elderlyMonitor' as SidebarOption, label: '监测老人' },
  { key: 'aiAnalysis' as SidebarOption, label: 'AI分析报告' },
  { key: 'settings' as SidebarOption, label: '系统设置' },
];

const aiSubOptions = [
  { key: 'demandAnalysis' as AiSubFunction, label: '需求分析' },
  { key: 'satisfaction' as AiSubFunction, label: '满意度分析' },
  { key: 'recommendation' as AiSubFunction, label: '服务推荐' },
  { key: 'consumptionTrend' as AiSubFunction, label: '消费趋势' },
];

const aiAgents = [
  { key: 'qwen' as AiAgent, label: '文心一言' },
  { key: 'chatgpt' as AiAgent, label: 'ChatGPT' },
  { key: 'ernie' as AiAgent, label: 'ERNIE Bot' },
  { key: 'gemini' as AiAgent, label: 'Gemini' },
];

const Profile = () => {
  // ========== 核心状态（增加兜底，避免undefined） ==========
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // 3=管理员

  // 改密码相关
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changePwdLoading, setChangePwdLoading] = useState<boolean>(false);
  const [changePwdError, setChangePwdError] = useState<string>('');

  // 老人管理核心状态（初始化兜底）
  const [elderlyForm, setElderlyForm] = useState<Elderly>({
    name: '',
    id_card: '',
    health_level: '',
    emergency_contact: '',
    address: '',
  });
  const [elderlyList, setElderlyList] = useState<Elderly[]>([]);
  const [totalElderly, setTotalElderly] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [listLoading, setListLoading] = useState<boolean>(false);
  const [operateLoading, setOperateLoading] = useState<boolean>(false);
  const [currentElderlyId, setCurrentElderlyId] = useState<number | null>(null);
  const [showElderlyModal, setShowElderlyModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'create' | 'update'>('create');

  // 订单管理相关状态
  const [orderList, setOrderList] = useState<ServiceOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [orderLoading, setOrderLoading] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string>('');
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize] = useState<number>(20);

  // 进出记录相关状态
  const [accessList, setAccessList] = useState<AccessRecord[]>([]);
  const [totalAccess, setTotalAccess] = useState<number>(0);
  const [accessLoading, setAccessLoading] = useState<boolean>(false);
  const [accessError, setAccessError] = useState<string>('');
  const [accessPage, setAccessPage] = useState<number>(1);
  const [accessPageSize] = useState<number>(20);
  const [selectedElderlyId, setSelectedElderlyId] = useState<number | null>(null);

  // 监测老人相关状态
  const [monitorSearchKeyword, setMonitorSearchKeyword] = useState<string>('');
  const [monitorElderlyList, setMonitorElderlyList] = useState<Elderly[]>([]);
  const [monitorElderlyLoading, setMonitorElderlyLoading] = useState<boolean>(false);
  const [monitorElderlyError, setMonitorElderlyError] = useState<string>('');
  const [monitorPage, setMonitorPage] = useState<number>(1);
  const [monitorPageSize] = useState<number>(10);
  const [totalMonitorElderly, setTotalMonitorElderly] = useState<number>(0);
  const [showAddRelationModal, setShowAddRelationModal] = useState<boolean>(false);
  const [selectedElderlyForAdd, setSelectedElderlyForAdd] = useState<Elderly | null>(null);
  const [relationInput, setRelationInput] = useState<string>('');
  const [addingRelation, setAddingRelation] = useState<boolean>(false);

  // 其他状态
  const [activeOption, setActiveOption] = useState<SidebarOption>('userInfo');
  const [activeAiFunc, setActiveAiFunc] = useState<AiSubFunction>('demandAnalysis');
  const [activeAgent, setActiveAgent] = useState<AiAgent>('qwen');
  const [questionInput, setQuestionInput] = useState<string>('');
  const [aiReply, setAiReply] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [aiApiUrl, setAiApiUrl] = useState<string>('https://api.example.com/ai/chat');
  const [aiApiKey, setAiApiKey] = useState<string>('sk_xxxxxxxxxxxxxxxxxxxxxxxx');
  const [allowAiAnalysis, setAllowAiAnalysis] = useState<boolean>(true);
  const [publicComment, setPublicComment] = useState<boolean>(false);
  const [receivePush, setReceivePush] = useState<boolean>(true);
  const [theme, setTheme] = useState<string>('blue');
  const [fontSize, setFontSize] = useState<string>('default');

  const navigate = useNavigate();

  // 使用 auth store 的登录状态，避免状态不一致问题
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  // ========== 初始化（核心：登录后自动拉取用户信息） ==========
  useEffect(() => {
    const fetchUserProfile = async () => {
      // RequireAuth 已经确保 isLoggedIn 为 true，直接拉取数据
      if (!isLoggedIn) {
        return; // 不应该到这里，但作为防护
      }

      try {
        setProfileLoading(true);
        // 调用正确的用户信息接口
        const response = await api.get('/auth/profile');
        const profileData = response.data as UserProfile;

        // 验证接口返回字段完整性
        if (!profileData.id || !profileData.username || profileData.user_type === undefined) {
          throw new Error('用户信息字段不完整');
        }

        setUserData(profileData);
        setIsAdmin(profileData.user_type === 3); // 严格匹配管理员类型
        setNewPhone(profileData.phone || '');

        // 如果是服务商，重定向到商户中心
        if (profileData.user_type === 2) {
          navigate('/MerchantServer', { replace: true });
          return;
        }
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            // 登录过期，通过 auth store 清除状态
            const logout = useAuthStore.getState().logout;
            logout();
            navigate('/');
            setProfileError('登录已过期，请重新登录');
            message.error('登录已过期，请重新登录');
          } else {
            setProfileError(err.response?.data?.detail || '获取用户信息失败');
          }
        } else {
          setProfileError('未知错误，获取用户信息失败');
        }
      } finally {
        setProfileLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchUserProfile();
    }
  }, [isLoggedIn, navigate]);

  // ========== 侧边栏点击（非管理员不执行老人列表请求） ==========
  const handleSidebarClick = (option: SidebarOption) => {
    setActiveOption(option);
    // 只有管理员+点击系统设置，才加载老人列表
    if (option === 'settings' && isAdmin) {
      handleGetElderlyList();
    }
  };

  // ========== 改密码功能 ==========
  const handleChangePassword = async () => {
    if (!oldPassword.trim()) {
      setChangePwdError('请输入原密码');
      return;
    }
    if (newPassword.length < 6) {
      setChangePwdError('新密码至少6个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePwdError('新密码与确认密码不一致');
      return;
    }

    try {
      setChangePwdLoading(true);
      setChangePwdError('');
      await api.post('/auth/change-password', {
        old_password: oldPassword.trim(),
        new_password: newPassword.trim(),
      });
      message.success('密码修改成功！请重新登录');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // 通过 auth store 清除登录状态
      const logout = useAuthStore.getState().logout;
      logout();
      navigate('/');
    } catch (err) {
      let errMsg = '修改密码失败';
      if (axios.isAxiosError(err)) {
        errMsg = err.response?.data?.detail || '原密码错误或账号异常';
      }
      setChangePwdError(errMsg);
      message.error(errMsg);
    } finally {
      setChangePwdLoading(false);
    }
  };

  // ========== 订单管理增删改查 ==========
  const handleGetOrderList = async (page: number = 1, pageSize: number = 20) => {
    setOrderLoading(true);
    setOrderError('');
    try {
      const offset = (page - 1) * pageSize;
      const response = await api.get('/orders/', { params: { offset, limit: pageSize } });
      const resData = response.data as OrderListResponse;
      setOrderList(resData.items || []);
      setTotalOrders(resData.total || 0);
      setOrderPage(page);
    } catch (err) {
      setOrderList([]);
      setTotalOrders(0);
      if (axios.isAxiosError(err)) {
        setOrderError(err.response?.data?.detail || '获取订单列表失败');
      } else {
        setOrderError('获取订单列表失败');
      }
      console.log('获取订单列表失败', err);
    } finally {
      setOrderLoading(false);
    }
  };

  // 确认订单
  const handleConfirmOrder = async (orderId: number) => {
    try {
      await api.patch(`/orders/${orderId}/confirm`);
      message.success('订单已确认');
      handleGetOrderList();
    } catch (err) {
      message.error('确认订单失败');
      console.log('确认订单失败', err);
    }
  };

  // 完成订单
  const handleCompleteOrder = async (orderId: number) => {
    try {
      await api.patch(`/orders/${orderId}/complete`);
      message.success('订单已完成');
      handleGetOrderList();
    } catch (err) {
      message.error('完成订单失败');
      console.log('完成订单失败', err);
    }
  };

  // 评分订单
  const handleRateOrder = async (orderId: number, score: number, content?: string) => {
    try {
      await api.patch(`/orders/${orderId}/rate`, { score, content });
      message.success('评分成功');
      handleGetOrderList();
    } catch (err) {
      message.error('评分失败');
      console.log('评分失败', err);
    }
  };

  // 当切换到订单管理时加载订单列表
  useEffect(() => {
    if (activeOption === 'orderManage' && isLoggedIn) {
      handleGetOrderList();
    }
  }, [activeOption, isLoggedIn]);

  // ========== 进出记录管理 ==========
  const handleGetAccessList = async (
    page: number = 1,
    pageSize: number = 20,
    elderlyId?: number
  ) => {
    // 如果是老人用户，自动使用其elderly_id；否则使用选定的elderly_id
    let targetElderlyId = elderlyId;
    if (!targetElderlyId) {
      if (userData?.user_type === 1 && userData?.elderly_id) {
        // 老人用户
        targetElderlyId = userData.elderly_id;
      } else if (selectedElderlyId) {
        // 非老人但已选择老人
        targetElderlyId = selectedElderlyId;
      } else {
        setAccessError('请先选择一个老人');
        return;
      }
    }

    try {
      setAccessLoading(true);
      setAccessError('');
      const offset = (page - 1) * pageSize;
      const response = await api.get('/access/', {
        params: {
          elderly_id: targetElderlyId,
          offset,
          limit: pageSize,
        },
      });
      const resData = response.data as AccessRecordListResponse;
      setAccessList(resData.items || []);
      setTotalAccess(resData.total || 0);
      setAccessPage(page);
    } catch (err) {
      setAccessList([]);
      setTotalAccess(0);
      if (axios.isAxiosError(err)) {
        setAccessError(err.response?.data?.detail || '获取进出记录失败');
      } else {
        setAccessError('获取进出记录失败');
      }
      console.log('获取进出记录失败', err);
    } finally {
      setAccessLoading(false);
    }
  };

  // 当切换到进出记录时加载
  useEffect(() => {
    if (activeOption === 'accessRecord' && isLoggedIn) {
      // 如果是老人，自动加载；如果需要选择老人则提示
      if (userData?.user_type === 1 && userData?.elderly_id) {
        // 直接调用 API 获取进出记录
        (async () => {
          const offset = 0;
          const targetElderlyId = userData.elderly_id;
          try {
            setAccessLoading(true);
            setAccessError('');
            const response = await api.get('/access/', {
              params: {
                elderly_id: targetElderlyId,
                offset,
                limit: accessPageSize,
              },
            });
            const resData = response.data as AccessRecordListResponse;
            setAccessList(resData.items || []);
            setTotalAccess(resData.total || 0);
            setAccessPage(1);
          } catch (err) {
            setAccessList([]);
            setTotalAccess(0);
            if (axios.isAxiosError(err)) {
              setAccessError(err.response?.data?.detail || '获取进出记录失败');
            } else {
              setAccessError('获取进出记录失败');
            }
            console.log('获取进出记录失败', err);
          } finally {
            setAccessLoading(false);
          }
        })();
      } else if (isAdmin) {
        // 管理员需要先选择老人
        setAccessError('请先从系统设置中选择一个老人');
      }
    }
  }, [
    activeOption,
    isLoggedIn,
    userData?.user_type,
    userData?.elderly_id,
    isAdmin,
    accessPageSize,
  ]);

  // ========== 监测老人相关函数 ==========
  const handleSearchElderly = async (keyword: string, page: number = 1) => {
    try {
      setMonitorElderlyLoading(true);
      setMonitorElderlyError('');
      const response = await api.get('/elders/', {
        params: {
          keyword: keyword || undefined,
          page,
          size: monitorPageSize,
        },
      });
      const resData = response.data;
      setMonitorElderlyList(resData.items || []);
      setTotalMonitorElderly(resData.total || 0);
      setMonitorPage(page);
    } catch (err) {
      setMonitorElderlyList([]);
      setTotalMonitorElderly(0);
      if (axios.isAxiosError(err)) {
        setMonitorElderlyError(err.response?.data?.detail || '搜索老人失败');
      } else {
        setMonitorElderlyError('搜索老人失败');
      }
    } finally {
      setMonitorElderlyLoading(false);
    }
  };

  const handleAddElderlyRelation = async () => {
    if (!selectedElderlyForAdd || !relationInput.trim()) {
      message.error('请选择老人并输入关系');
      return;
    }

    try {
      setAddingRelation(true);
      // 创建家族成员关系
      await api.post('/families/members', {
        elderly_id: selectedElderlyForAdd.id,
        name: userData?.username || '家属',
        phone: userData?.phone || '',
        relation: relationInput.trim(),
        permission_level: 'view',
      });
      message.success('成功添加关联老人！');
      setShowAddRelationModal(false);
      setSelectedElderlyForAdd(null);
      setRelationInput('');
      // 刷新列表
      handleSearchElderly(monitorSearchKeyword, monitorPage);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        message.error(err.response?.data?.detail || '添加老人关联失败');
      } else {
        message.error('添加老人关联失败');
      }
    } finally {
      setAddingRelation(false);
    }
  };

  // ========== 老人管理增删改查 ==========
  const handleGetElderlyList = async (page: number = 1, size: number = 20) => {
    // 非管理员直接返回，不触发任何报错
    if (!isAdmin) return;
    setListLoading(true);
    try {
      const response = await api.get('/elders/', { params: { page, size } });
      const resData = response.data as ElderlyListResponse;
      // 兜底：如果返回数据格式不对，设为空数组
      setElderlyList(resData.data || []);
      setTotalElderly(resData.total || 0);
      setCurrentPage(page);
    } catch (err) {
      // 错误兜底：设为空数组，避免渲染崩溃
      setElderlyList([]);
      setTotalElderly(0);
      console.log('获取老人列表失败', err);
    } finally {
      setListLoading(false);
    }
  };

  const handleCreateElderly = async () => {
    if (!elderlyForm.name || !elderlyForm.id_card) {
      message.warning('请填写姓名和身份证号');
      return;
    }
    setOperateLoading(true);
    try {
      await api.post('/elders/', elderlyForm);
      message.success('老人信息创建成功');
      setShowElderlyModal(false);
      handleGetElderlyList(currentPage);
      setElderlyForm({
        name: '',
        id_card: '',
        health_level: '',
        emergency_contact: '',
        address: '',
      });
    } catch {
      message.error('创建老人信息失败，请稍后重试');
    } finally {
      setOperateLoading(false);
    }
  };

  const handleGetElderlyDetail = async (id: number) => {
    if (!id) return;
    setOperateLoading(true);
    try {
      const response = await api.get(`/elders/${id}`);
      setElderlyForm(response.data as Elderly);
      setCurrentElderlyId(id);
      setModalType('update');
      setShowElderlyModal(true);
    } catch {
      message.error('获取老人详情失败');
    } finally {
      setOperateLoading(false);
    }
  };

  const handleUpdateElderly = async () => {
    if (!currentElderlyId || !elderlyForm.name || !elderlyForm.id_card) {
      message.warning('请填写完整信息');
      return;
    }
    setOperateLoading(true);
    try {
      await api.put(`/elders/${currentElderlyId}`, elderlyForm);
      message.success('老人信息更新成功');
      setShowElderlyModal(false);
      handleGetElderlyList(currentPage);
      setElderlyForm({
        name: '',
        id_card: '',
        health_level: '',
        emergency_contact: '',
        address: '',
      });
    } catch {
      message.error('更新老人信息失败');
    } finally {
      setOperateLoading(false);
    }
  };

  const handleDeleteElderly = async (id: number) => {
    if (!id || !window.confirm('确定要删除该老人信息吗？此操作不可恢复')) return;
    setOperateLoading(true);
    try {
      await api.delete(`/elders/${id}`);
      message.success('老人信息删除成功');
      const newPage = elderlyList.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      handleGetElderlyList(newPage);
    } catch {
      message.error('删除老人信息失败');
    } finally {
      setOperateLoading(false);
    }
  };

  const handleElderlyFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setElderlyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenCreateModal = () => {
    setModalType('create');
    setElderlyForm({ name: '', id_card: '', health_level: '', emergency_contact: '', address: '' });
    setShowElderlyModal(true);
  };

  // ========== AI分析功能 ==========
  const handleAiFuncClick = (func: AiSubFunction) => {
    setActiveAiFunc(func);
  };

  const handleSubmitQuestion = () => {
    if (!questionInput.trim()) {
      message.warning('请输入询问内容');
      return;
    }
    if (!allowAiAnalysis) {
      message.warning('请先启用AI分析功能');
      return;
    }
    if (!aiApiUrl.trim() || !aiApiKey.trim()) {
      message.warning('请配置AI接口地址和密钥');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiReply('');
    setTimeout(() => {
      try {
        const agentName = aiAgents.find((item) => item.key === activeAgent)?.label;
        let reply = '';
        switch (activeAgent) {
          case 'qwen':
            reply = `【${agentName}】针对"${questionInput}"，建议：1. 健康问题可咨询社区医生；2. 服务预约可通过"我的订单"板块操作。`;
            break;
          case 'chatgpt':
            reply = `【${agentName}】Regarding "${questionInput}": You can check community services via the "My Orders" section, or consult a doctor for health concerns.`;
            break;
          case 'ernie':
            reply = `【${agentName}】您好！"${questionInput}"相关解答：社区服务支持在线预约，健康档案可在个人中心查看。`;
            break;
          case 'gemini':
            reply = `【${agentName}】For "${questionInput}": Use the "Order Management" to book services, or contact community staff for urgent needs.`;
            break;
          default:
            reply = `【${agentName}】您的问题已收到，相关服务可通过平台功能板块操作。`;
        }
        setAiReply(reply);
      } catch {
        setAiError('AI回复失败，请重试');
      } finally {
        setAiLoading(false);
        setQuestionInput('');
      }
    }, 1500);
  };

  const handleSaveSettings = () => {
    const savedSettings = {
      phone: newPhone || userData?.phone || '未修改',
      aiApiUrl,
      aiApiKey,
      allowAiAnalysis,
      publicComment,
      receivePush,
      theme,
      fontSize,
    };
    console.log('保存设置：', savedSettings);
    message.success('设置保存成功');
    if (!newPhone) setNewPhone(userData?.phone || '');
  };

  // ========== 渲染AI内容 ==========
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

  // ========== 主内容渲染（增加兜底，避免白屏） ==========
  const renderShowContent = () => {
    // 加载中
    if (profileLoading) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 border-4 border-[#1E90FF] border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-[#1E90FF] font-semibold">加载用户信息中...</div>
        </div>
      );
    }

    // 加载失败兜底
    if (profileError || !userData) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6">
          <div className="text-red-600 font-semibold mb-4">
            {profileError || '未获取到用户信息'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#1E90FF] text-white rounded-lg hover:bg-[#187bcd] transition-colors"
          >
            点击刷新
          </button>
        </div>
      );
    }

    // 正常渲染
    switch (activeOption) {
      case 'userInfo':
        return (
          <div className="w-full h-full flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-[#1E90FF] mb-6">用户基本信息</h2>
            <div className="w-4/5 bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">用户名：</span>
                <span className="font-medium">{userData.username || '未知'}</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">手机号：</span>
                <span className="font-medium">{userData.phone || '未绑定'}</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">邮箱：</span>
                <span className="font-medium">{userData.email || '未绑定'}</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">身份类型：</span>
                <span className="font-medium">
                  {userData.user_type === 3
                    ? '管理员'
                    : userData.user_type === 1
                      ? '老人'
                      : userData.user_type === 2
                        ? '服务商'
                        : '其他'}
                </span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">账号状态：</span>
                <span className="font-medium text-green-600">
                  {userData.is_active ? '正常' : '已禁用'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-gray-600">注册时间：</span>
                <span className="font-medium">
                  {userData.created_at
                    ? new Date(userData.created_at).toLocaleDateString()
                    : '未知'}
                </span>
              </div>
              {userData.user_type === 3 && (
                <div className="mt-6 p-3 bg-[#EBF5FF] rounded-lg text-[#1E90FF] text-sm">
                  ✅ 您是管理员，可在【系统设置】中管理老人信息
                </div>
              )}
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
                <span className="font-medium">{userData.real_name || '未填写'}</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">性别：</span>
                <span className="font-medium">{userData.gender || '未填写'}</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">年龄：</span>
                <span className="font-medium">{userData.age || '未填写'}</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">居住地址：</span>
                <span className="font-medium">{userData.address || '未填写'}</span>
              </div>
              <div className="flex items-center mb-4">
                <span className="w-32 text-gray-600">最后登录：</span>
                <span className="font-medium">
                  {userData.last_login_at
                    ? new Date(userData.last_login_at).toLocaleString()
                    : '从未登录'}
                </span>
              </div>
            </div>
          </div>
        );
      case 'orderManage':
        return (
          <div className="w-full h-full flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-[#1E90FF] mb-6">我的订单</h2>
            <div className="w-4/5 bg-white rounded-xl shadow-md p-6">
              {orderLoading ? (
                <div className="text-center py-8">加载中...</div>
              ) : orderError ? (
                <div className="text-center py-8 text-red-600">{orderError}</div>
              ) : orderList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无订单</div>
              ) : (
                <table className="w-full text-center border-collapse">
                  <thead className="bg-[#EBF5FF]">
                    <tr>
                      <th className="p-3 rounded-l-lg border border-gray-200">订单编号</th>
                      <th className="p-3 border border-gray-200">服务ID</th>
                      <th className="p-3 border border-gray-200">下单时间</th>
                      <th className="p-3 border border-gray-200">订单状态</th>
                      <th className="p-3 border border-gray-200">支付状态</th>
                      <th className="p-3 rounded-r-lg border border-gray-200">操作</th>
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
                                  : order.order_status === 'confirmed'
                                    ? 'bg-yellow-100 text-yellow-600'
                                    : 'bg-gray-100 text-gray-600'
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
                                : order.pay_status === 'unpaid'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {order.pay_status || '未知'}
                          </span>
                        </td>
                        <td className="p-3 border border-gray-200">
                          <div className="flex gap-2 justify-center">
                            {order.order_status === 'pending' && (
                              <button
                                onClick={() => order.order_id && handleConfirmOrder(order.order_id)}
                                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                确认
                              </button>
                            )}
                            {order.order_status === 'confirmed' && (
                              <button
                                onClick={() =>
                                  order.order_id && handleCompleteOrder(order.order_id)
                                }
                                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                              >
                                完成
                              </button>
                            )}
                            {order.order_status === 'completed' && (
                              <button
                                onClick={() => {
                                  const score = prompt('请输入评分 (1-5):', '5');
                                  if (score && order.order_id) {
                                    handleRateOrder(order.order_id, parseInt(score));
                                  }
                                }}
                                className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                              >
                                评分
                              </button>
                            )}
                            <button className="px-3 py-1 text-xs text-[#1E90FF] border border-[#1E90FF] rounded hover:bg-[#1E90FF] hover:text-white">
                              详情
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {totalOrders > 0
                    ? `共 ${totalOrders} 个订单，当前第 ${orderPage} 页`
                    : '暂无订单'}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={orderPage === 1 || orderLoading}
                    onClick={() => handleGetOrderList(orderPage - 1, orderPageSize)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1 text-sm">
                    {orderPage} / {Math.ceil(totalOrders / orderPageSize) || 1}
                  </span>
                  <button
                    disabled={orderPage >= Math.ceil(totalOrders / orderPageSize) || orderLoading}
                    onClick={() => handleGetOrderList(orderPage + 1, orderPageSize)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'accessRecord':
        return (
          <div className="w-full h-full flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-[#1E90FF] mb-6">进出记录</h2>
            <div className="w-4/5 bg-white rounded-xl shadow-md p-6">
              {/* 如果是非老人用户，显示老人选择 */}
              {userData?.user_type !== 1 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">请选择一个老人查看其进出记录</p>
                  <div className="flex gap-2">
                    {elderlyList.length > 0 ? (
                      <select
                        value={selectedElderlyId || ''}
                        onChange={(e) => {
                          const elderlyId = parseInt(e.target.value);
                          setSelectedElderlyId(elderlyId);
                          handleGetAccessList(1, accessPageSize, elderlyId);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1E90FF]"
                      >
                        <option value="">-- 选择老人 --</option>
                        {elderlyList.map((elderly) => (
                          <option key={elderly.id} value={elderly.id}>
                            {elderly.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => handleGetElderlyList()}
                        className="px-4 py-2 bg-[#1E90FF] text-white rounded hover:bg-blue-600"
                      >
                        加载老人列表
                      </button>
                    )}
                  </div>
                </div>
              )}

              {accessLoading ? (
                <div className="text-center py-8">加载中...</div>
              ) : accessError ? (
                <div className="text-center py-8 text-red-600">{accessError}</div>
              ) : accessList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无进出记录</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse">
                    <thead className="bg-[#EBF5FF]">
                      <tr>
                        <th className="p-3 rounded-l-lg border border-gray-200">记录编号</th>
                        <th className="p-3 border border-gray-200">进出类型</th>
                        <th className="p-3 border border-gray-200">记录时间</th>
                        <th className="p-3 border border-gray-200">通道位置</th>
                        <th className="p-3 rounded-r-lg border border-gray-200">异常标记</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessList.map((record) => (
                        <tr
                          key={record.access_id}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="p-3 border border-gray-200">#{record.access_id}</td>
                          <td className="p-3 border border-gray-200">
                            <span
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                record.access_type === 'IN'
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}
                            >
                              {record.access_type === 'IN' ? '进' : '出'}
                            </span>
                          </td>
                          <td className="p-3 border border-gray-200">
                            {record.record_time
                              ? new Date(record.record_time).toLocaleString('zh-CN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : '-'}
                          </td>
                          <td className="p-3 border border-gray-200">
                            {record.gate_location || '-'}
                          </td>
                          <td className="p-3 border border-gray-200">
                            <span
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                record.is_abnormal === 'YES'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-green-100 text-green-600'
                              }`}
                            >
                              {record.is_abnormal === 'YES' ? '异常' : '正常'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 分页控件 */}
              {totalAccess > 0 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    共 {totalAccess} 条记录，当前第 {accessPage} 页
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={accessPage <= 1 || accessLoading}
                      onClick={() => handleGetAccessList(accessPage - 1, accessPageSize)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      上一页
                    </button>
                    <span className="px-3 py-1 text-sm">
                      {accessPage} / {Math.ceil(totalAccess / accessPageSize) || 1}
                    </span>
                    <button
                      disabled={
                        accessPage >= Math.ceil(totalAccess / accessPageSize) || accessLoading
                      }
                      onClick={() => handleGetAccessList(accessPage + 1, accessPageSize)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'elderlyMonitor':
        return (
          <div className="w-full h-full flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-[#1E90FF] mb-6">监测老人</h2>
            <div className="w-4/5 bg-white rounded-xl shadow-md p-6">
              {/* 搜索框 */}
              <div className="mb-6 flex gap-2">
                <input
                  type="text"
                  value={monitorSearchKeyword}
                  onChange={(e) => setMonitorSearchKeyword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchElderly(monitorSearchKeyword, 1);
                    }
                  }}
                  placeholder="搜索老人：输入名字、手机号等关键词"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                />
                <button
                  onClick={() => handleSearchElderly(monitorSearchKeyword, 1)}
                  disabled={monitorElderlyLoading}
                  className="px-6 py-2 bg-[#1E90FF] text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  搜索
                </button>
              </div>

              {monitorElderlyError && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200 text-red-600">
                  {monitorElderlyError}
                </div>
              )}

              {/* 老人列表 */}
              {monitorElderlyLoading ? (
                <div className="text-center py-8">加载中...</div>
              ) : monitorElderlyList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {monitorSearchKeyword ? '没有找到匹配的老人' : '请输入关键词搜索老人'}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-center border-collapse">
                      <thead className="bg-[#EBF5FF]">
                        <tr>
                          <th className="p-3 border border-gray-200">ID</th>
                          <th className="p-3 border border-gray-200">姓名</th>
                          <th className="p-3 border border-gray-200">身份证</th>
                          <th className="p-3 border border-gray-200">健康等级</th>
                          <th className="p-3 border border-gray-200">紧急联系人</th>
                          <th className="p-3 border border-gray-200">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monitorElderlyList.map((elderly) => (
                          <tr key={elderly.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-3 border border-gray-200">{elderly.id}</td>
                            <td className="p-3 border border-gray-200">{elderly.name}</td>
                            <td className="p-3 border border-gray-200">{elderly.id_card}</td>
                            <td className="p-3 border border-gray-200">{elderly.health_level}</td>
                            <td className="p-3 border border-gray-200">{elderly.emergency_contact}</td>
                            <td className="p-3 border border-gray-200">
                              <button
                                onClick={() => {
                                  setSelectedElderlyForAdd(elderly);
                                  setShowAddRelationModal(true);
                                }}
                                className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                              >
                                添加关联
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 分页 */}
                  {totalMonitorElderly > monitorPageSize && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        共 {totalMonitorElderly} 个老人，当前第 {monitorPage} 页
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={monitorPage === 1 || monitorElderlyLoading}
                          onClick={() => handleSearchElderly(monitorSearchKeyword, monitorPage - 1)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                        >
                          上一页
                        </button>
                        <span className="px-3 py-1 text-sm">
                          {monitorPage} / {Math.ceil(totalMonitorElderly / monitorPageSize)}
                        </span>
                        <button
                          disabled={monitorPage >= Math.ceil(totalMonitorElderly / monitorPageSize) || monitorElderlyLoading}
                          onClick={() => handleSearchElderly(monitorSearchKeyword, monitorPage + 1)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                        >
                          下一页
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 添加关联弹框 */}
              {showAddRelationModal && selectedElderlyForAdd && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-96">
                    <h4 className="text-lg font-semibold mb-4">添加老人关联</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-600 mb-2">老人信息</label>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p><strong>{selectedElderlyForAdd.name}</strong></p>
                          <p className="text-sm text-gray-500">{selectedElderlyForAdd.id_card}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-2">您与老人的关系</label>
                        <input
                          type="text"
                          value={relationInput}
                          onChange={(e) => setRelationInput(e.target.value)}
                          placeholder="如：子女、配偶、朋友等"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowAddRelationModal(false);
                          setSelectedElderlyForAdd(null);
                          setRelationInput('');
                        }}
                        disabled={addingRelation}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddElderlyRelation}
                        disabled={addingRelation}
                        className="px-4 py-2 bg-[#1E90FF] text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {addingRelation ? '添加中...' : '确认添加'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'aiAnalysis':
        return (
          <div className="w-full h-full flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-[#1E90FF] mb-6">档案AI分析报告</h2>
            <div className="w-4/5 bg-white rounded-xl shadow-md p-6">
              <div className="mb-6">
                <label className="text-gray-700 font-medium mr-3">选择智能体：</label>
                <div className="flex flex-wrap gap-3 inline-block">
                  {aiAgents.map((agent) => (
                    <button
                      key={agent.key}
                      className={`px-4 py-1.5 rounded-lg transition-colors text-sm ${activeAgent === agent.key ? 'bg-[#1E90FF] text-white font-semibold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => setActiveAgent(agent.key)}
                    >
                      {agent.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mb-6">
                {aiSubOptions.map((func) => (
                  <button
                    key={func.key}
                    className={`px-4 py-2 rounded-lg transition-colors ${activeAiFunc === func.key ? 'bg-[#1E90FF] text-white font-semibold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => handleAiFuncClick(func.key)}
                  >
                    {func.label}
                  </button>
                ))}
              </div>
              <div className="bg-[#EBF5FF] p-2 rounded-lg mb-4 text-sm text-[#1E90FF]">
                当前使用智能体：
                <span className="font-semibold">
                  {aiAgents.find((item) => item.key === activeAgent)?.label || '文心一言'}
                </span>
              </div>
              <div className="mb-6 border-t border-b border-gray-200 py-4">
                <h4 className="text-lg font-semibold mb-3 text-[#333]">AI智能问答</h4>
                <div className="relative w-full">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF] pr-20"
                    disabled={aiLoading}
                    placeholder="可以询问我健康知识、社区服务相关问题哦~"
                  />
                  <button
                    onClick={handleSubmitQuestion}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg transition-colors text-sm ${aiLoading ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-[#1E90FF] text-white hover:bg-[#187bcd]'}`}
                    disabled={aiLoading}
                  >
                    {aiLoading ? '正在提问...' : '提问'}
                  </button>
                </div>
              </div>
              {aiError && (
                <div className="mb-6 bg-red-50 p-3 rounded-lg border border-red-200 text-red-600">
                  ⚠️ {aiError}
                </div>
              )}
              {aiReply && (
                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h5 className="font-semibold text-[#1E90FF] mb-2">AI回答：</h5>
                  <p className="text-gray-700">{aiReply}</p>
                </div>
              )}
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
                      onChange={(e) => {
                        setOldPassword(e.target.value);
                        setChangePwdError('');
                      }}
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
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setChangePwdError('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                        placeholder="请输入新密码（至少6位）"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-gray-600 block">确认新密码</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setChangePwdError('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                        placeholder="请再次输入新密码"
                      />
                    </div>
                  </div>
                  {changePwdError && (
                    <div className="text-red-600 text-sm mt-1">⚠️ {changePwdError}</div>
                  )}
                  <button
                    onClick={handleChangePassword}
                    className={`px-6 py-2 rounded-lg transition-colors font-semibold text-white ${changePwdLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1E90FF] hover:bg-[#187bcd]'}`}
                    disabled={changePwdLoading}
                  >
                    {changePwdLoading ? '修改中...' : '修改密码'}
                  </button>
                  <div className="space-y-2 mt-6">
                    <label className="text-gray-600 block">更换手机号</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                      placeholder={`当前手机号：${userData.phone || '未绑定'}`}
                    />
                  </div>
                </div>
              </div>
              {/* AI配置 */}
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
                        title="蓝色主题"
                      ></button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-black' : 'border-transparent'}`}
                        style={{ backgroundColor: '#333' }}
                        title="深色主题"
                      ></button>
                      <button
                        onClick={() => setTheme('light')}
                        className={`w-8 h-8 rounded-full border-2 ${theme === 'light' ? 'border-black' : 'border-transparent'}`}
                        style={{ backgroundColor: '#f5f5f5' }}
                        title="浅色主题"
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
              {/* 管理员专属：老人信息管理（3=管理员才显示） */}
              {isAdmin && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4 text-[#333] border-b pb-2 border-gray-200">
                    老人信息管理【管理员专属】
                  </h3>
                  <button
                    onClick={handleOpenCreateModal}
                    className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    + 创建老人信息
                  </button>
                  {/* 老人列表（兜底样式，避免挤压） */}
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-center border-collapse">
                      <thead className="bg-[#EBF5FF]">
                        <tr>
                          <th className="p-3 border border-gray-200">ID</th>
                          <th className="p-3 border border-gray-200">姓名</th>
                          <th className="p-3 border border-gray-200">身份证号</th>
                          <th className="p-3 border border-gray-200">健康等级</th>
                          <th className="p-3 border border-gray-200">紧急联系人</th>
                          <th className="p-3 border border-gray-200">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listLoading ? (
                          <tr>
                            <td colSpan={6} className="p-4">
                              <div className="flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-[#1E90FF] border-t-transparent rounded-full animate-spin mr-2"></div>
                                <span>加载中...</span>
                              </div>
                            </td>
                          </tr>
                        ) : elderlyList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-gray-500">
                              暂无老人信息，点击「创建老人信息」添加
                            </td>
                          </tr>
                        ) : (
                          elderlyList.map((elderly) => (
                            <tr key={elderly.id} className="border-b border-gray-200">
                              <td className="p-3 border border-gray-200">{elderly.id}</td>
                              <td className="p-3 border border-gray-200">{elderly.name}</td>
                              <td className="p-3 border border-gray-200">{elderly.id_card}</td>
                              <td className="p-3 border border-gray-200">{elderly.health_level}</td>
                              <td className="p-3 border border-gray-200">
                                {elderly.emergency_contact}
                              </td>
                              <td className="p-3 border border-gray-200">
                                <button
                                  onClick={() => handleGetElderlyDetail(elderly.id!)}
                                  className="mr-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                  disabled={operateLoading}
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => handleDeleteElderly(elderly.id!)}
                                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                  disabled={operateLoading}
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* 分页 */}
                  {totalElderly > 20 && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={() => handleGetElderlyList(currentPage - 1)}
                        disabled={currentPage === 1 || listLoading}
                        className="px-3 py-1 border rounded-l mr-1 disabled:opacity-50"
                      >
                        上一页
                      </button>
                      <span className="px-3 py-1 border">第 {currentPage} 页</span>
                      <button
                        onClick={() => handleGetElderlyList(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(totalElderly / 20) || listLoading}
                        className="px-3 py-1 border rounded-r ml-1 disabled:opacity-50"
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* 保存按钮 */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2 bg-[#1E90FF] text-white rounded-lg hover:bg-[#187bcd] transition-colors font-semibold"
                >
                  保存其他设置
                </button>
              </div>
            </div>
            {/* 老人弹窗 */}
            {showElderlyModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-1/3">
                  <h4 className="text-lg font-semibold mb-4">
                    {modalType === 'create' ? '创建老人信息' : '更新老人信息'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-600 mb-1">姓名（必填）</label>
                      <input
                        type="text"
                        name="name"
                        value={elderlyForm.name}
                        onChange={handleElderlyFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                        placeholder="请输入老人姓名"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">身份证号（必填）</label>
                      <input
                        type="text"
                        name="id_card"
                        value={elderlyForm.id_card}
                        onChange={handleElderlyFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                        placeholder="请输入身份证号"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">健康等级</label>
                      <input
                        type="text"
                        name="health_level"
                        value={elderlyForm.health_level}
                        onChange={handleElderlyFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                        placeholder="如：良好/一般/较差"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">紧急联系人</label>
                      <input
                        type="text"
                        name="emergency_contact"
                        value={elderlyForm.emergency_contact}
                        onChange={handleElderlyFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                        placeholder="请输入紧急联系人及电话"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">居住地址</label>
                      <input
                        type="text"
                        name="address"
                        value={elderlyForm.address}
                        onChange={handleElderlyFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E90FF]"
                        placeholder="请输入居住地址"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setShowElderlyModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                      disabled={operateLoading}
                    >
                      取消
                    </button>
                    <button
                      onClick={modalType === 'create' ? handleCreateElderly : handleUpdateElderly}
                      className="px-4 py-2 bg-[#1E90FF] text-white rounded-lg hover:bg-[#187bcd] transition-colors"
                      disabled={operateLoading}
                    >
                      {operateLoading ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                          提交中...
                        </div>
                      ) : modalType === 'create' ? (
                        '创建'
                      ) : (
                        '更新'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center">请选择左侧功能菜单</div>
        );
    }
  };

  // ========== 组件渲染 ==========
  return (
    <div className="Profile min-h-screen bg-gray-50">
      <header className="w-full bg-[#1E90FF]">
        <div className="wrapper flex w-[80%] h-[60px] m-auto items-center">
          <div className="logo mr-[30px]">
            <a href="javascript:;" onClick={() => navigate('/')} className="flex items-center">
              <img src={icon} alt="LOGO图片" title="主页" className="h-[40px] w-auto" />
              <h1 className="w-[245px] font-bold text-2xl h-[60px] leading-[60px] text-white ml-2">
                智慧社区服务中心
              </h1>
            </a>
          </div>
          <ul className="flex w-[500px] h-[60px] leading-[60px] font-semibold justify-evenly items-center">
            <li>
              <a href="#" className="text-white hover:text-[#EBF5FF] transition-colors">
                解决方案
              </a>
            </li>
            <li>
              <a href="#" className="text-white hover:text-[#EBF5FF] transition-colors">
                社区近况
              </a>
            </li>
            <li>
              <a href="#" className="text-white hover:text-[#EBF5FF] transition-colors">
                运营商招揽
              </a>
            </li>
            <li>
              <a href="#" className="text-white hover:text-[#EBF5FF] transition-colors">
                志愿者中心
              </a>
            </li>
          </ul>
          <div className="search flex items-center ml-auto">
            <a href="#" className="flex items-center mr-[10px]">
              <span className="iconfont icon-hezuohuoban inline-block text-2xl mr-[10px] font-semibold text-white"></span>
              <span className="font-semibold leading-[60px] text-white">获取服务</span>
            </a>
            <a href="#" className="text-white">
              <span className="inline-block iconfont icon-sousuo text-[20px] font-semibold"></span>
            </a>
            {/* 管理员专属：快速访问商户中心 */}
            {isAdmin && (
              <button
                onClick={() => navigate('/MerchantServer')}
                className="ml-6 px-4 py-2 bg-white text-[#1E90FF] rounded-lg font-semibold hover:bg-[#EBF5FF] transition-colors"
              >
                前往商户中心
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="py-6">
        <div className="wrapper w-[80%] flex m-auto">
          <div className="boxbody w-full shadow-lg rounded-2xl flex p-2 bg-white">
            <aside className="bg-[#d7eaf7] h-[980px] w-[200px] rounded-3xl p-4">
              <ul className="font-semibold text-[20px] text-center flex flex-col h-full">
                {sidebarOptions.map((option, index) => (
                  <li
                    key={option.key}
                    className={`mt-[${index === 0 ? 20 : 30}px] border-2 border-dotted border-[#1E90FF] hover:bg-gray-100 cursor-pointer py-3 rounded-lg transition-colors ${activeOption === option.key ? 'bg-[#1E90FF] text-white' : 'text-[#333]'}`}
                    onClick={() => handleSidebarClick(option.key)}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            </aside>
            <div className="show flex-1 ml-4 h-[980px] bg-gray-50 rounded-3xl overflow-auto p-4">
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
          <ul className="w-full h-[40px] flex items-center justify-center mt-[25px] font-semibold">
            <li className="mr-[40px]">
              <a
                href="https://github.com/oOtiti/SmartCommHub"
                className="hover:text-[#1E90FF] transition-colors"
              >
                项目主页
              </a>
            </li>
            <li className="mr-[40px]">
              <a href="#" className="hover:text-[#1E90FF] transition-colors">
                技术栈
              </a>
            </li>
            <li className="mr-[40px]">
              <a
                href="https://github.com/oOtiti/SmartCommHub"
                className="hover:text-[#1E90FF] transition-colors"
              >
                WIKI
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-[#1E90FF] transition-colors">
                支持我们
              </a>
            </li>
          </ul>
          <div className="project flex justify-center items-center mt-6">
            <li className="mr-[20px]">
              <a href="https://developer.mozilla.org/zh-CN/docs/Web/HTML">
                <span className="iconfont icon-html text-3xl! text-orange-600"></span>
              </a>
            </li>
            <li className="mr-[20px]">
              <a href="https://zh-hans.react.dev/">
                <span className="iconfont icon-react text-3xl! text-blue-500"></span>
              </a>
            </li>
            <li className="mr-[20px]">
              <a href="https://vitejs.cn/vite3-cn/guide/">
                <span className="iconfont icon-vite text-3xl! text-purple-600"></span>
              </a>
            </li>
            <li className="mr-[20px]">
              <a href="https://www.python.org/">
                <span className="iconfont icon-python text-3xl! text-blue-600"></span>
              </a>
            </li>
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
