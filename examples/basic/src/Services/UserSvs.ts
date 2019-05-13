import { ServiceBase, ServiceMixin } from "react-svs";

async function fakeLogin(username: string, password: string) {
  // wait for 2s, simulating a network request
  await new Promise((res, rej) => {
    setTimeout(() => {
      res()
    }, 100);
  })
  if (username === 'csr' && password === '123') {
    return ({ success: true, userId: 1 })
  } else {
    return ({ success: false })
  }
}


interface IUserState {
  user: { userId: number; username: string } | null;
}

const UserSvs = ServiceMixin(
  class extends ServiceBase({
    user: null
  } as IUserState) {
    /** This is comment for login method.  */
    public async login(username: string, password: string) {
      const { success, userId } = await fakeLogin(username, password)
      if (!success || !userId) throw new Error('login fail')
      this.setProviderState({ user: { username, userId } });
    }
    /** This is comment for logout method.  */
    public async logout() {
      // wait for 2s, simulating a network request
      await new Promise((res, rej) => {
        setTimeout(() => {
          res()
        }, 100);
      })
      this.setProviderState({
        user: null
      })
    }
  }
);

export default UserSvs;
