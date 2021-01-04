from .models import Edge
from .models import EdgeDirection
from .models import Node
from .models import NodeType


class SecurityGroupProcessor(object):
    def __init__(self):
        pass

    def get_graph(self, security_groups):
        self._validate(security_groups)
        all_nodes = {}
        all_edges = set()
        for security_group in security_groups:
            security_group_id = security_group['GroupId']
            # Add security group node
            all_nodes[security_group_id] = Node(
                security_group_id,
                NodeType.SECURITY_GROUP,
                security_group['GroupName'],
                metadata={
                    'vpc_id': security_group['VpcId'],
                },
            )
            for rule in security_group['IpPermissions']:
                nodes, edges = self._process_rule(
                    rule,
                    security_group_id,
                    EdgeDirection.IN,
                )
                all_nodes.update(nodes)
                all_edges.update(edges)
            for rule in security_group['IpPermissionsEgress']:
                nodes, edges = self._process_rule(
                    rule,
                    security_group_id,
                    EdgeDirection.OUT,
                )
                all_nodes.update(nodes)
                all_edges.update(edges)

        return {'nodes': all_nodes, 'edges': list(all_edges)}

    def _validate(self, security_groups):
        def validate_rule(rule):
            exclusive_fields = 0
            if rule['IpRanges'] or rule['Ipv6Ranges']:
                exclusive_fields += 1
            if rule['UserIdGroupPairs']:
                exclusive_fields += 1
            if rule['PrefixListIds']:
                exclusive_fields += 1

            if exclusive_fields == 0:
                raise ValueError('No mutually exclusive fields detected.')
            if exclusive_fields > 1:
                raise ValueError('More than one mutually exclusive fields detected.')

        for security_group_info in security_groups:
            for rule in security_group_info['IpPermissions']:
                validate_rule(rule)
            for rule in security_group_info['IpPermissionsEgress']:
                validate_rule(rule)


    def _process_rule(self, rule, security_group_id, direction):
        '''
        Direction w/r/t SecurityGroup.
        
        There's a lot of clean up to do here.
        '''
        nodes = {}
        edges = set()
        if rule['IpRanges'] or rule['Ipv6Ranges']:
            for ipv4_range in rule['IpRanges']:
                # Add node
                cidr_ip = ipv4_range['CidrIp']
                nodes[cidr_ip] = Node(cidr_ip, NodeType.CIDR_IP, cidr_ip)

                # Add Edge
                edge_kwargs = {
                    'protocol': rule['IpProtocol'],
                    'port_range': tuple([
                        rule.get('FromPort', -1),
                        rule.get('ToPort', -1),
                    ]),
                }
                if direction == EdgeDirection.OUT:
                    edges.add(Edge(security_group_id, cidr_ip, **edge_kwargs))
                elif direction == EdgeDirection.IN:
                    edges.add(Edge(cidr_ip, security_group_id, **edge_kwargs))
                else:
                    raise ValueError('Invalid EdgeDirection: {}'.format(direction))

            for ipv6_range in rule['Ipv6Ranges']:
                cidr_ip = ipv6_range['CidrIpv6']
                # Add node
                nodes[cidr_ip] = Node(cidr_ip, NodeType.CIDR_IPV6, cidr_ip)

                # Add edge
                edge_kwargs = {
                    'protocol': rule['IpProtocol'],
                    'port_range': tuple([
                        rule.get('FromPort', -1),
                        rule.get('ToPort', -1),
                    ]),
                }
                if direction == EdgeDirection.OUT:
                    edges.add(Edge(security_group_id, cidr_ip, **edge_kwargs))
                elif direction == EdgeDirection.IN:
                    edges.add(Edge(cidr_ip, security_group_id, **edge_kwargs))
                else:
                    raise ValueError('Invalid EdgeDirection: {}'.format(direction))
        elif rule['UserIdGroupPairs']:
            for user_id_group_pairs in rule['UserIdGroupPairs']:
                other_security_group_id = user_id_group_pairs['GroupId']
                # TODO: Hmm, what do we do about these?
                #       If in our account, we should have a. canonical entry
                #       Otherwise, we have incomplete info.
                #       Maybe we have to handle at merge time.
                # Add node
                nodes[security_group_id] = Node(
                    other_security_group_id,
                    NodeType.SECURITY_GROUP,
                    'UNKNOWN',
                )
                
                # Add edge
                edge_kwargs = {
                    'protocol': rule['IpProtocol'],
                    'port_range': tuple([
                        rule.get('FromPort', -1),
                        rule.get('ToPort', -1),
                    ]),
                }
                if direction == EdgeDirection.OUT:
                    edges.add(Edge(security_group_id, other_security_group_id, **edge_kwargs))
                elif direction == EdgeDirection.IN:
                    edges.add(Edge(other_security_group_id, security_group_id, **edge_kwargs))
                else:
                    raise ValueError('Invalid EdgeDirection: {}'.format(direction))
        elif rule['PrefixListIds']:
            for prefix_list in rule['PrefixListIds']:
                prefix_list_id = prefix_list['PrefixListId']
                # Add node
                nodes[prefix_list_id] = Node(
                    prefix_list_id,
                    NodeType.PREFIX_LIST,
                    prefix_list_id,
                )
                
                # Add edge
                edge_kwargs = {
                    'protocol': rule['IpProtocol'],
                    'port_range': tuple([
                        rule.get('FromPort', -1),
                        rule.get('ToPort', -1),
                    ]),
                }
                if direction == EdgeDirection.OUT:
                    edges.add(Edge(security_group_id, prefix_list_id, **edge_kwargs))
                elif direction == EdgeDirection.IN:
                    edges.add(Edge(prefix_list_id, security_group_id, **edge_kwargs))
                else:
                    raise ValueError('Invalid EdgeDirection: {}'.format(direction))

        # TODO: Use Graph object instead
        return (nodes, edges)
