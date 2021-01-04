import json

from .models import Edge
from .models import Node
from .models import NodeType


class NodeTypeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, NodeType):
            return obj  # Enum value
        else:
            return super().default(obj)


class NodeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Node):
            return obj.__dict__
        else:
            return super().default(obj)


class NodeDecoder(json.JSONDecoder):
    def __init__(self, *args, **kwargs):
        # See [https://bit.ly/3oaslU1 and https://bit.ly/3pOpAsf]
        # for why we can't just use `super()`.
        # I think it is because the __init__ call is going all the
        # way up to `object`.
        json.JSONDecoder.__init__(
            self,
            object_hook=self.object_hook,
            *args,
            **kwargs,
        )
        self._required_keys = ('_id', '_type', '_name', '_metadata')

    @property
    def required_keys(self):
        return self._required_keys

    def object_hook(self, dict_):
        if all([key in dict_ for key in self._required_keys]):
            return Node(
                dict_['_id'],
                NodeType(dict_['_type']),
                dict_['_name'],
                dict_['_metadata'],
            )
        return dict_


class EdgeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Edge):
            return obj.__dict__
        else:
            return super().default(obj)


class EdgeDecoder(json.JSONDecoder):
    def __init__(self, *args, **kwargs):
        json.JSONDecoder.__init__(
            self,
            object_hook=self.object_hook,
            *args,
            **kwargs,
        )
        self._required_keys = ('_source', '_target', '_protocol', '_port_range')

    @property
    def required_keys(self):
        return self._required_keys

    def object_hook(self, dict_):
        if all([key in dict_ for key in self._required_keys]):
            return Edge(
                dict_['_source'],
                dict_['_target'],
                dict_['_protocol'],
                tuple(dict_['_port_range']),
            )
        return dict_


class GraphEncoder(json.JSONEncoder):
    def __init__(self, *args, **kwargs):
        json.JSONEncoder.__init__(self, *args, **kwargs)
        self._encoders = {
            'node': NodeEncoder(),
            'node_type': NodeTypeEncoder(),
            'edge': EdgeEncoder(),
        }

    def default(self, obj):
        if isinstance(obj, Node):
            return self._encoders['node'].default(obj)
        elif isinstance(obj, NodeType):
            return self._encoders['node_type'].default(obj)
        elif isinstance(obj, Edge):
            return self._encoders['edge'].default(obj)
        else:
            return super().default(obj)


class GraphDecoder(json.JSONDecoder):
    def __init__(self, *args, **kwargs):
        json.JSONDecoder.__init__(
            self,
            object_hook=self.object_hook,
            *args,
            **kwargs,
        )
        self._decoders = {
            'node': NodeDecoder(),
            'edge': EdgeDecoder(),
        }

    def object_hook(self, dict_):
        if self._required_keys_present(
                dict_,
                self._decoders['node'].required_keys,
        ):
            return self._decoders['node'].object_hook(dict_)
        elif self._required_keys_present(
            dict_,
            self._decoders['edge'].required_keys,
        ):
            return self._decoders['edge'].object_hook(dict_)
        return dict_
    
    def _required_keys_present(self, dict_, keys):
        return all([key in dict_ for key in keys])
