import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';
import { CreateProductFormDto } from './dto/create-product-form.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MAX_PRODUCT_IMAGES, productImageMulterOptions } from './multer-options.factory';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard)
@Roles(UserRole.OWNER)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create product (multipart: images + fields)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['images', 'name', 'price', 'descriptionRaw'],
      properties: {
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
        name: { type: 'string' },
        price: { type: 'number' },
        descriptionRaw: { type: 'string' },
        isPublished: { type: 'boolean' },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('images', MAX_PRODUCT_IMAGES, productImageMulterOptions(MAX_PRODUCT_IMAGES)),
  )
  async create(
    @CurrentUser() user: JwtPayloadUser,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: CreateProductFormDto,
  ) {
    return this.productsService.createForUser(user.sub, body, files ?? []);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate product (draft copy, same photos)' })
  async duplicate(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.productsService.duplicateForUser(user.sub, id);
  }

  @Post(':id/images')
  @ApiOperation({ summary: 'Append more product images (max 8 total)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['images'],
      properties: {
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('images', MAX_PRODUCT_IMAGES, productImageMulterOptions(MAX_PRODUCT_IMAGES)),
  )
  async appendImages(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.appendImagesForUser(user.sub, id, files ?? []);
  }

  @Get()
  @ApiOperation({ summary: 'List products for current user' })
  async list(@CurrentUser() user: JwtPayloadUser) {
    return this.productsService.listForUser(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one product' })
  async getOne(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.productsService.findByIdForUser(user.sub, id);
  }

  @Patch(':id/image')
  @ApiOperation({ summary: 'Replace all product images with a single new image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('image', productImageMulterOptions(1)))
  async updateImage(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.updateForUser(user.sub, id, {}, file);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product fields (JSON)' })
  async updateJson(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateProductDto,
  ) {
    return this.productsService.updateForUser(user.sub, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product' })
  async remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.productsService.deleteForUser(user.sub, id);
  }
}
