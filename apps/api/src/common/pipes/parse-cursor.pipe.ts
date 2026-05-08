import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ParseCursorPipe implements PipeTransform<string | undefined> {
  transform(value: string | undefined): string | undefined {
    if (!value) return undefined;

    if (!UUID_RE.test(value)) {
      throw new BadRequestException('Invalid cursor format');
    }

    return value;
  }
}
