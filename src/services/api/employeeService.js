import employees from '@/services/mockData/employees.json';

let employeeData = [...employees];
let lastId = Math.max(...employeeData.map(emp => emp.Id), 0);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const employeeService = {
  async getAll() {
    await delay(300);
    return [...employeeData];
  },

  async getById(id) {
    await delay(200);
    const employee = employeeData.find(emp => emp.Id === parseInt(id));
    return employee ? { ...employee } : null;
  },

  async create(employeeData) {
    await delay(400);
    const newEmployee = {
      ...employeeData,
      Id: ++lastId,
      salary: parseFloat(employeeData.salary),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    employeeData.push(newEmployee);
    return { ...newEmployee };
  },

  async update(id, updatedData) {
    await delay(300);
    const index = employeeData.findIndex(emp => emp.Id === parseInt(id));
    if (index === -1) {
      throw new Error('Employee not found');
    }
    
    const updatedEmployee = {
      ...employeeData[index],
      ...updatedData,
      Id: parseInt(id),
      salary: parseFloat(updatedData.salary),
      updatedAt: new Date().toISOString()
    };
    
    employeeData[index] = updatedEmployee;
    return { ...updatedEmployee };
  },

  async delete(id) {
    await delay(200);
    const index = employeeData.findIndex(emp => emp.Id === parseInt(id));
    if (index === -1) {
      throw new Error('Employee not found');
    }
    
    const deletedEmployee = employeeData.splice(index, 1)[0];
    return { ...deletedEmployee };
  },

  async getByDepartment(department) {
    await delay(250);
    return employeeData
      .filter(emp => emp.department === department)
      .map(emp => ({ ...emp }));
  },

  async getActiveEmployees() {
    await delay(250);
    return employeeData
      .filter(emp => emp.status === 'active')
      .map(emp => ({ ...emp }));
},

  async updateRole(userId, newRole) {
    await delay(300);
    const index = employeeData.findIndex(emp => emp.Id === parseInt(userId));
    if (index === -1) {
      throw new Error('Employee not found');
    }
    
    employeeData[index] = {
      ...employeeData[index],
      role: newRole,
      updatedAt: new Date().toISOString()
    };
    
    return { ...employeeData[index] };
  }
};

export default employeeService;