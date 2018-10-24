import { User } from '../../models';
import { IUserDocument } from '../../models/user.model';
import {
  default as createAuthPayload,
  IAuthPayload,
} from '../../services/createAuthPayload';
import { IContext } from '../types/IContext';
import {
  baseResolver,
  isAdminResolver,
  isAuthenticatedResolver,
} from './common';
import { AuthorizationError } from '../errors/AuthorizationError';
import { EmailAlreadyExistsError } from '../errors/EmailAlreadyExistsError';

const signInResolver = async (
  _: any,
  { email, password }: any,
): Promise<IAuthPayload> => {
  const user:
    | IUserDocument
    | undefined
    | null = await User.getByEmailAndPassword(email, password);

  if (!user) {
    throw new AuthorizationError();
  }

  return createAuthPayload(user);
};

const signUpResolver = async (
  _: any,
  { name, email, password, roles }: any,
): Promise<IAuthPayload> => {
  if (await User.getByEmail(email)) {
    throw new EmailAlreadyExistsError({
      message: `Has an user registered with this email: ${email}`,
    });
  }

  const user: IUserDocument | null = await User.create({
    email,
    name,
    password: await User.generatePasswordHash(password),
    roles,
  });

  return createAuthPayload(user);
};

const meResolver = async (
  _: any,
  {},
  { user }: IContext,
): Promise<IUserDocument | undefined> => user;

const removeUserResolver = async (_: any, { id }: any): Promise<boolean> => {
  await User.findByIdAndDelete(id);
  return true;
};

const createUserResolver = async (
  _: any,
  { password, email, ...props }: any,
): Promise<IUserDocument> => {
  if (await User.getByEmail(email)) {
    throw new EmailAlreadyExistsError({
      message: `Has an user registered with this email: ${email}`,
    });
  }

  return await User.create({
    email,
    password: await User.generatePasswordHash(password),
    ...props,
  });
};

const updateUserResolver = async (
  _: any,
  { id, ...rest }: any,
): Promise<IUserDocument | null> => {
  if (
    rest.email !== undefined &&
    (await User.findOne({
      _id: { $ne: id },
      email: new RegExp(`^${rest.email}$`, 'i'),
    }))
  ) {
    throw new EmailAlreadyExistsError({
      message: `Has an user registered with this email: ${rest.email}`,
    });
  }

  return await User.findByIdAndUpdate(id, { $set: { ...rest } }, { new: true });
};

export default {
  Mutation: {
    signIn: baseResolver.createResolver(signInResolver),
    signUp: baseResolver.createResolver(signUpResolver),
    removeUser: isAdminResolver.createResolver(removeUserResolver),
    createUser: isAdminResolver.createResolver(createUserResolver),
    updateUser: isAdminResolver.createResolver(updateUserResolver),
  },
  Query: {
    me: isAuthenticatedResolver.createResolver(meResolver),
  },
};
