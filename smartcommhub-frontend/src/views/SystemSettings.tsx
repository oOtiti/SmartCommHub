import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Select, message, Card } from 'antd';
import { api } from '../api/client';
import RequireAuth from '../components/RequireAuth';

type UserTypeOption = 0 | 1 | 2 | 3;

const SystemSettings = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  const [formElderFamily] = Form.useForm();
  const [formProvider] = Form.useForm();
  const [formResetPwd] = Form.useForm();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await api.get('/auth/profile');
        const userType: UserTypeOption = res.data?.user_type;
        // 后端约定：0为管理员
        if (userType === 0) {
          setIsAdmin(true);
        } else {
          message.error('需要管理员权限');
          navigate('/', { replace: true });
        }
      } catch (err) {
        message.error('获取用户信息失败');
        navigate('/', { replace: true });
      }
    };
    checkRole();
  }, [navigate]);

  const handleCreateElderOrFamily = async (values: {
    username: string;
    password: string;
    phone?: string;
    user_type: UserTypeOption;
    elderly_id?: number;
    family_id?: number;
  }) => {
    try {
      await api.post('/auth/admin/create-user', values);
      message.success('创建成功');
      formElderFamily.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '创建失败');
    }
  };

  const handleCreateProvider = async (values: {
    username: string;
    password: string;
    phone?: string;
    provider_id?: number;
  }) => {
    try {
      await api.post('/auth/admin/create-user', { ...values, user_type: 3 });
      message.success('创建成功');
      formProvider.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '创建失败');
    }
  };

  const handleAdminResetPassword = async (values: { username: string; new_password: string }) => {
    try {
      await api.post('/auth/admin/reset-password', values);
      message.success('密码已重置');
      formResetPwd.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '重置失败');
    }
  };

  if (!isAdmin) {
    return (
      <RequireAuth>
        <div style={{ padding: 24 }}>正在验证权限...</div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="创建老人/家庭成员" bordered>
          <Form form={formElderFamily} layout="vertical" onFinish={handleCreateElderOrFamily}>
            <Form.Item
              name="user_type"
              label="类型"
              rules={[{ required: true, message: '请选择类型' }]}
            >
              <Select
                options={[
                  { value: 1, label: '老人(1)' },
                  { value: 2, label: '家庭成员(2)' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="如 elderly001 / family001" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="至少6位" />
            </Form.Item>
            <Form.Item name="phone" label="手机号">
              <Input placeholder="可选，但建议填写" />
            </Form.Item>
            <Form.Item name="elderly_id" label="关联老人ID(可选)">
              <Input type="number" placeholder="可选：直接绑定老人记录" />
            </Form.Item>
            <Form.Item name="family_id" label="家庭ID(可选)">
              <Input type="number" placeholder="可选：绑定家庭记录" />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              创建
            </Button>
          </Form>
        </Card>

        <Card title="创建运营商(服务商)" bordered>
          <Form form={formProvider} layout="vertical" onFinish={handleCreateProvider}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="如 operator001" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="至少6位" />
            </Form.Item>
            <Form.Item name="phone" label="手机号">
              <Input placeholder="可选，但建议填写" />
            </Form.Item>
            <Form.Item name="provider_id" label="关联服务商ID(可选)">
              <Input type="number" placeholder="可选：绑定服务商实体记录" />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              创建
            </Button>
          </Form>
        </Card>

        <Card title="管理员重置任意账户密码" bordered>
          <Form form={formResetPwd} layout="vertical" onFinish={handleAdminResetPassword}>
            <Form.Item
              name="username"
              label="目标用户名"
              rules={[{ required: true, message: '请输入目标用户名' }]}
            >
              <Input placeholder="如 operator001 / elderly001 / family001 / admin001" />
            </Form.Item>
            <Form.Item
              name="new_password"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '至少6位' },
              ]}
            >
              <Input.Password placeholder="至少6位" />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              重置密码
            </Button>
          </Form>
        </Card>
      </div>
    </RequireAuth>
  );
};

export default SystemSettings;
