import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number) {
    return this.prisma.address.findMany({
      where: { buyerId: userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: number, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.unsetAllDefaults(userId);
    }

    return this.prisma.address.create({
      data: {
        buyerId: userId,
        recipientName: dto.recipientName,
        phone: dto.phone,
        addressDetail: dto.addressDetail,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(userId: number, addressId: number, dto: UpdateAddressDto) {
    const address = await this.ensureOwnership(userId, addressId);

    return this.prisma.address.update({
      where: { id: address.id },
      data: {
        ...(dto.recipientName !== undefined && { recipientName: dto.recipientName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.addressDetail !== undefined && { addressDetail: dto.addressDetail }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
      },
    });
  }

  async remove(userId: number, addressId: number) {
    const address = await this.ensureOwnership(userId, addressId);

    await this.prisma.address.delete({
      where: { id: address.id },
    });

    return { message: 'Address deleted successfully' };
  }

  async setDefault(userId: number, addressId: number) {
    const address = await this.ensureOwnership(userId, addressId);

    await this.unsetAllDefaults(userId);

    await this.prisma.address.update({
      where: { id: address.id },
      data: { isDefault: true },
    });

    return this.prisma.address.findUnique({ where: { id: address.id } });
  }

  private async unsetAllDefaults(userId: number) {
    await this.prisma.address.updateMany({
      where: { buyerId: userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private async ensureOwnership(userId: number, addressId: number) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.buyerId !== userId) {
      throw new BadRequestException('You do not own this address');
    }

    return address;
  }
}
